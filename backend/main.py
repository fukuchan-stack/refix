from fastapi import FastAPI, HTTPException, Depends, Header, Request, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware # CORSをインポート
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

# ▼▼▼ CORSミドルウェアの設定を追加 ▼▼▼
origins = [
    "http://localhost:3000", # フロントエンドの開発サーバー
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ▲▲▲ ここまで追加 ▲▲▲

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"--- GLOBAL EXCEPTION HANDLER CAUGHT: {repr(exc)} ---")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "source": "global_handler",
            "detail": f"An unhandled exception occurred: {repr(exc)}"
        },
    )

api_router = APIRouter(prefix="/api")

# --- 共通のDependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def verify_api_key(x_api_key: str = Header(None)):
    internal_api_key = os.getenv("INTERNAL_API_KEY")
    if internal_api_key and x_api_key != internal_api_key:
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return x_api_key

visits = defaultdict(lambda: {'count': 0, 'last_access': 0.0})
lock = threading.Lock()
DAY_IN_SECONDS = 24 * 60 * 60
RATE_LIMIT_PER_DAY = 5

async def rate_limiter(request: Request):
    ip = request.client.host
    current_time = time.time()
    with lock:
        if int(visits[ip]['last_access'] / DAY_IN_SECONDS) < int(current_time / DAY_IN_SECONDS):
            visits[ip]['count'] = 0
        visits[ip]['count'] += 1
        visits[ip]['last_access'] = current_time
        if visits[ip]['count'] > RATE_LIMIT_PER_DAY:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again tomorrow.")
    return ip

# --- ProjectのCRUDエンドポイント ---
@api_router.post("/projects/", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = crud.get_project_by_github_url(db, github_url=project.github_url)
    if db_project:
        raise HTTPException(status_code=400, detail="GitHub URL already registered")
    return crud.create_project(db=db, project=project)

@api_router.get("/projects/", response_model=List[schemas.Project], dependencies=[Depends(verify_api_key)])
def read_projects(user_id: str, skip: int = 0, limit: int = 100, sort_by: str = 'newest', db: Session = Depends(get_db)):
    return crud.get_projects_by_user(db=db, user_id=user_id, skip=skip, limit=limit, sort_by=sort_by)

@api_router.get("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@api_router.patch("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.update_project_name(db=db, project_id=project_id, name=project_update.name)

@api_router.delete("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(verify_api_key)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.delete_project(db=db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@api_router.patch("/projects/order", dependencies=[Depends(verify_api_key)])
def update_project_order(update_data: schemas.ProjectOrderUpdate, db: Session = Depends(get_db)):
    crud.update_projects_order(db=db, ordered_ids=update_data.ordered_ids, user_id=update_data.user_id)
    return {"message": "Project order updated successfully"}

@api_router.post("/projects/reorder", response_model=List[schemas.Project], dependencies=[Depends(verify_api_key)])
def reorder_projects_endpoint(reorder_data: schemas.ProjectReorderRequest, db: Session = Depends(get_db)):
    return crud.reorder_projects(db=db, user_id=reorder_data.user_id, sort_by=reorder_data.sort_by)

# --- 監査とテストのエンドポイント ---
@api_router.post("/projects/{project_id}/inspect", dependencies=[Depends(verify_api_key)])
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

@api_router.post("/inspect/public", dependencies=[Depends(rate_limiter)])
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

@api_router.post("/tests/generate", dependencies=[Depends(verify_api_key)])
async def generate_test(request: GenerateTestRequest):
    try:
        generated_test_code = await ai_partner.generate_test_code(
            original_code=request.original_code,
            revised_code=request.revised_code,
            language=request.language
        )
        return {"test_code": generated_test_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tests/run", dependencies=[Depends(verify_api_key)])
async def run_test(request: RunTestRequest):
    try:
        result = await sandbox_service.run_code_in_sandbox(
            test_code=request.test_code,
            code_to_test=request.code_to_test,
            language=request.language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 作成したルーターをアプリに登録
app.include_router(api_router)