import os
import asyncio
from datetime import datetime
from collections import defaultdict
import threading
import traceback

from fastapi import FastAPI, HTTPException, Depends, Header, Request, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel

import crud
import models
import schemas
import ai_partner
import sandbox_service
import snyk_service
import cross_check_service
import github_service
import memory_service
from auth import auth_verifier

from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(redirect_slashes=False)

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

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
@api_router.post("/projects/", response_model=schemas.Project, dependencies=[Depends(auth_verifier)])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    db_project = crud.get_project_by_github_url(db, github_url=project.github_url)
    if db_project:
        raise HTTPException(status_code=400, detail="GitHub URL already registered")
    
    return crud.create_project(db=db, project=project)

@api_router.get("/projects/", response_model=List[schemas.Project], dependencies=[Depends(auth_verifier)])
def read_projects(user_id: str, skip: int = 0, limit: int = 100, sort_by: str = 'newest', db: Session = Depends(get_db)):
    return crud.get_projects_by_user(db=db, user_id=user_id, skip=skip, limit=limit, sort_by=sort_by)

@api_router.get("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(auth_verifier)])
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@api_router.patch("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(auth_verifier)])
def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return crud.update_project_name(db=db, project_id=project_id, name=project_update.name)

@api_router.delete("/projects/{project_id}", response_model=schemas.Project, dependencies=[Depends(auth_verifier)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.delete_project(db=db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@api_router.patch("/projects/order", dependencies=[Depends(auth_verifier)])
def update_project_order(update_data: schemas.ProjectOrderUpdate, db: Session = Depends(get_db)):
    crud.update_projects_order(db=db, ordered_ids=update_data.ordered_ids, user_id=update_data.user_id)
    return {"message": "Project order updated successfully"}

@api_router.post("/projects/reorder", response_model=List[schemas.Project], dependencies=[Depends(auth_verifier)])
def reorder_projects_endpoint(reorder_data: schemas.ProjectReorderRequest, db: Session = Depends(get_db)):
    return crud.reorder_projects(db=db, user_id=reorder_data.user_id, sort_by=reorder_data.sort_by)

# --- 監査とテストのエンドポイント ---
@api_router.post("/projects/{project_id}/inspect", dependencies=[Depends(auth_verifier)])
async def inspect_code(project_id: int, request: schemas.CodeInspectionRequest, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files_dict = {f"pasted_code.txt": request.code}
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ai_models = ["Gemini (Balanced)", "GPT-4o (Strict Audit)"]
    inspection_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            inspection_results.append({"model_name": ai_models[i], "error": str(res)})
        else:
            inspection_results.append({"model_name": ai_models[i], "review": res})
            
    try:
        title = f"Review at {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        conversation_schema = schemas.ConversationCreate(project_id=project_id, title=title)
        db_conversation = crud.create_conversation(db=db, conversation=conversation_schema)

        user_message_schema = schemas.MessageCreate(role="user", content=request.code)
        db_user_message = crud.create_message(db=db, message=user_message_schema, conversation_id=db_conversation.id)
        user_embedding = memory_service.generate_embedding(request.code)
        crud.update_message_embedding(db=db, message_id=db_user_message.id, embedding=user_embedding)
        
        review_summary = "\n".join(
            f"- {res['model_name']}: {res['review']['summary']}" 
            for res in inspection_results if 'review' in res and 'summary' in res['review']
        )
        assistant_message_schema = schemas.MessageCreate(role="assistant", content=f"AIレビューが完了しました。\n{review_summary}")
        db_assistant_message = crud.create_message(db=db, message=assistant_message_schema, conversation_id=db_conversation.id)
        assistant_embedding = memory_service.generate_embedding(review_summary)
        crud.update_message_embedding(db=db, message_id=db_assistant_message.id, embedding=assistant_embedding)
        
        print(f"--- DEBUG: Saved and vectorized conversation {db_conversation.id} for project {project_id} ---")

    except Exception as e:
        print(f"--- DEBUG: ERROR - Failed to save or vectorize conversation: {e} ---")

    return inspection_results

@api_router.post("/inspect/public", dependencies=[Depends(rate_limiter)])
async def public_inspect_code(request: schemas.CodeInspectionRequest):
    files_dict = {f"pasted_code.txt": request.code}
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ai_models = ["Gemini (Balanced)", "GPT-4o (Strict Audit)"]
    inspection_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            inspection_results.append({"model_name": ai_models[i], "error": str(res)})
        else:
            inspection_results.append({"model_name": ai_models[i], "review": res})
    return inspection_results

@api_router.post("/tests/generate", dependencies=[Depends(auth_verifier)])
async def generate_test(request: schemas.GenerateTestRequest):
    try:
        generated_test_code = await ai_partner.generate_test_code(
            original_code=request.original_code,
            revised_code=request.revised_code,
            language=request.language
        )
        return {"test_code": generated_test_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/tests/run", dependencies=[Depends(auth_verifier)])
async def run_test(request: schemas.RunTestRequest):
    try:
        result = await sandbox_service.run_code_in_sandbox(
            test_code=request.test_code,
            code_to_test=request.code_to_test,
            language=request.language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/snyk/scan", dependencies=[Depends(auth_verifier)], tags=["Snyk"])
async def scan_with_snyk(request: schemas.SnykScanRequest):
    try:
        scan_results = snyk_service.scan_dependencies(
            file_content=request.code,
            language=request.language
        )
        return scan_results
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"An unexpected error occurred during Snyk scan: {e}")
        raise HTTPException(status_code=500, detail="An unexpected internal error occurred.")

@api_router.post("/inspect/consolidated", dependencies=[Depends(rate_limiter)])
async def consolidated_inspect_code(request: schemas.CodeInspectionRequest):
    files_dict = {f"pasted_code.txt": request.code}
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    ai_models = ["Gemini (Balanced)", "GPT-4o (Strict Audit)"]
    raw_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            raw_results.append({"model_name": ai_models[i], "error": str(res)})
        else:
            raw_results.append({"model_name": ai_models[i], "review": res})

    consolidated_issues = cross_check_service.consolidate_reviews(raw_results)
    
    return {"consolidated_issues": consolidated_issues}

@api_router.post("/projects/{project_id}/inspect/consolidated", dependencies=[Depends(auth_verifier)])
async def consolidated_inspect_code_authenticated(project_id: int, request: schemas.CodeInspectionRequest, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files_dict = {f"pasted_code.txt": request.code}
    tasks = [
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="balanced"),
        ai_partner.generate_structured_review(files=files_dict, linter_results="", mode="strict_audit"),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    ai_models = ["Gemini (Balanced)", "GPT-4o (Strict Audit)"]
    raw_results = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            raw_results.append({"model_name": ai_models[i], "error": str(res)})
        else:
            raw_results.append({"model_name": ai_models[i], "review": res})

    consolidated_issues = cross_check_service.consolidate_reviews(raw_results)
    
    return {"consolidated_issues": consolidated_issues}

@api_router.post("/chat", dependencies=[Depends(auth_verifier)])
async def handle_chat(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    try:
        db_conversation = crud.get_latest_conversation_by_project_id(db, project_id=request.project_id)
        if not db_conversation:
            raise HTTPException(status_code=404, detail="Conversation not found. Please run a review first.")

        # ユーザーのメッセージを保存し、ベクトル化
        user_message_dict = request.chat_history[-1]
        user_message_schema = schemas.MessageCreate(**user_message_dict)
        db_user_message = crud.create_message(db, message=user_message_schema, conversation_id=db_conversation.id)
        user_embedding = memory_service.generate_embedding(user_message_dict['content'])
        crud.update_message_embedding(db=db, message_id=db_user_message.id, embedding=user_embedding)

        # AIからの応答を取得
        ai_response_content = await ai_partner.continue_conversation(
            db=db,
            project_id=request.project_id,
            chat_history=request.chat_history
        )

        # AIの応答を保存し、ベクトル化
        ai_message_schema = schemas.MessageCreate(role="assistant", content=ai_response_content)
        db_ai_message = crud.create_message(db, message=ai_message_schema, conversation_id=db_conversation.id)
        ai_embedding = memory_service.generate_embedding(ai_response_content)
        crud.update_message_embedding(db=db, message_id=db_ai_message.id, embedding=ai_embedding)
        
        print(f"--- DEBUG: Saved and vectorized chat messages to conversation {db_conversation.id} ---")

        return {"response": ai_response_content}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


app.include_router(api_router)