from fastapi import FastAPI, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import crud, models, schemas, ai_partner
from database import SessionLocal, engine
import os
import asyncio

models.Base.metadata.create_all(bind=engine)

app = FastAPI(redirect_slashes=False)

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
    if internal_api_key: # APIキーが.envに設定されている場合のみ検証
        if x_api_key != internal_api_key:
            raise HTTPException(status_code=403, detail="Could not validate credentials")
    return x_api_key

# --- ProjectのCRUDエンドポイント ---
# (create_project, read_projects, read_project, delete_project は変更なし)
@app.post("/projects/", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = crud.get_project_by_github_url(db, github_url=project.github_url)
    if db_project:
        raise HTTPException(status_code=400, detail="GitHub URL already registered")
    return crud.create_project(db=db, project=project)

@app.get("/projects/", response_model=List[schemas.Project], dependencies=[Depends(verify_api_key)])
def read_projects(user_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    projects = crud.get_projects_by_user(db=db, user_id=user_id, skip=skip, limit=limit)
    return projects

@app.get("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.delete("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.delete_project(db=db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project


# --- 新しいマルチAI監査エンドポイント (ここを修正) ---
@app.post("/projects/{project_id}/inspect", dependencies=[Depends(verify_api_key)])
async def inspect_code(project_id: int, request: schemas.CodeInspectionRequest, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # `generate_structured_review` が要求する `files` 辞書を作成
    # linterは一旦空で渡す
    files_dict = {f"pasted_code.txt": request.code}

    # ★★★ 修正箇所 ★★★
    # 正しい関数名 `generate_structured_review` を使い、引数も合わせる
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="fast_check"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    # ★★★ 修正ここまで ★★★
    
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