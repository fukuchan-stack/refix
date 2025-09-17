from fastapi import FastAPI, HTTPException, Depends, Header, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import crud, models, schemas, ai_partner
from schemas import GenerateTestRequest, RunTestRequest, ProjectUpdate, ProjectOrderUpdate, ProjectReorderRequest
from database import SessionLocal, engine
import sandbox_service
import os
import asyncio
import time
from collections import defaultdict
import threading

models.Base.metadata.create_all(bind=engine)

app = FastAPI(redirect_slashes=False)

# レート制限のための準備
visits = defaultdict(lambda: {'count': 0, 'last_access': 0.0})
lock = threading.Lock()
DAY_IN_SECONDS = 24 * 60 * 60
RATE_LIMIT_PER_DAY = 5


# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# APIキーを検証するDependency
async def verify_api_key(x_api_key: str = Header(None)):
    internal_api_key = os.getenv("INTERNAL_API_KEY")
    if internal_api_key:
        if x_api_key != internal_api_key:
            raise HTTPException(status_code=403, detail="Could not validate credentials")
    return x_api_key

# レート制限用の新しいDependency
async def rate_limiter(request: Request):
    ip = request.client.host
    current_time = time.time()
    
    with lock:
        last_day = int(visits[ip]['last_access'] / DAY_IN_SECONDS)
        today = int(current_time / DAY_IN_SECONDS)

        if last_day < today:
            visits[ip]['count'] = 1
            visits[ip]['last_access'] = current_time
        else:
            visits[ip]['count'] += 1
        
        if visits[ip]['count'] > RATE_LIMIT_PER_DAY:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again tomorrow.")
    
    return ip


# --- ProjectのCRUDエンドポイント ---
@app.post("/projects/", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = crud.get_project_by_github_url(db, github_url=project.github_url)
    if db_project:
        raise HTTPException(status_code=400, detail="GitHub URL already registered")
    return crud.create_project(db=db, project=project)

@app.get("/projects/", response_model=List[schemas.Project], dependencies=[Depends(verify_api_key)])
def read_projects(user_id: str, skip: int = 0, limit: int = 100, sort_by: str = 'newest', db: Session = Depends(get_db)):
    projects = crud.get_projects_by_user(db=db, user_id=user_id, skip=skip, limit=limit, sort_by=sort_by)
    return projects

@app.get("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.patch("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.update_project_name(db=db, project_id=project_id, name=project_update.name)

@app.delete("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.delete_project(db=db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.patch("/projects/order", dependencies=[Depends(verify_api_key)])
def update_project_order(update_data: schemas.ProjectOrderUpdate, db: Session = Depends(get_db)):
    crud.update_projects_order(db=db, ordered_ids=update_data.ordered_ids, user_id=update_data.user_id)
    return {"message": "Project order updated successfully"}

@app.post("/projects/reorder", response_model=List[schemas.Project], dependencies=[Depends(verify_api_key)])
def reorder_projects_endpoint(reorder_data: schemas.ProjectReorderRequest, db: Session = Depends(get_db)):
    updated_projects = crud.reorder_projects(db=db, user_id=reorder_data.user_id, sort_by=reorder_data.sort_by)
    return updated_projects


# --- 新しいマルチAI監査エンドポイント ---
@app.post("/projects/{project_id}/inspect", dependencies=[Depends(verify_api_key)])
async def inspect_code(project_id: int, request: schemas.CodeInspectionRequest, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    files_dict = {f"pasted_code.txt": request.code}
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="fast_check"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ai_models = ["Gemini (Balanced)", "Claude (Fast Check)", "GPT-4o (Strict Audit)"]
    inspection_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            inspection_results.append({"model_name": ai_models[i], "error": str(res)})
        else:
            inspection_results.append({"model_name": ai_models[i], "review": res})
    return inspection_results


# --- 古いレビュー生成エンドポイント ---
@app.post("/projects/{project_id}/generate-review", response_model=schemas.Review, dependencies=[Depends(verify_api_key)])
def generate_review_for_project(project_id: int, request: schemas.GenerateReviewRequest, db: Session = Depends(get_db)):
    return crud.generate_review_for_code_snippet(
        db=db, 
        project_id=project_id, 
        code=request.code, 
        language=request.language, 
        mode=request.mode
    )

# --- ログイン不要で使える公開APIエンドポイント ---
@app.post("/inspect/public", dependencies=[Depends(rate_limiter)])
async def public_inspect_code(request: schemas.CodeInspectionRequest):
    files_dict = {f"pasted_code.txt": request.code}
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="fast_check"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ai_models = ["Gemini (Balanced)", "Claude (Fast Check)", "GPT-4o (Strict Audit)"]
    inspection_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            inspection_results.append({"model_name": ai_models[i], "error": str(res)})
        else:
            inspection_results.append({"model_name": ai_models[i], "review": res})
    return inspection_results

# --- テストコード生成エンドポイント ---
@app.post("/api/tests/generate", dependencies=[Depends(verify_api_key)])
async def generate_test(request: GenerateTestRequest):
    try:
        generated_test_code = await ai_partner.generate_test_code(
            original_code=request.original_code,
            revised_code=request.revised_code,
            language=request.language
        )
        return {"test_code": generated_test_code}
    except Exception as e:
        error_message = f"An unexpected error occurred during test generation: {str(e)}"
        print(f"Error in generate_test: {error_message}")
        raise HTTPException(status_code=500, detail=error_message)

# --- テストコード実行エンドポイント ---
@app.post("/api/tests/run", dependencies=[Depends(verify_api_key)])
async def run_test(request: RunTestRequest):
    try:
        result = await sandbox_service.run_code_in_sandbox(
            test_code=request.test_code,
            code_to_test=request.code_to_test,
            language=request.language
        )
        return result
    except Exception as e:
        error_message = f"An unexpected error occurred while running the test: {str(e)}"
        print(f"Error in run_test: {error_message}")
        raise HTTPException(status_code=500, detail=error_message)