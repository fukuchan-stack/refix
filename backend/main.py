from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
import crud, models, schemas
from database import SessionLocal, engine
from fastapi.middleware.cors import CORSMiddleware
from typing import List

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORSミドルウェアの設定 ---
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- データベースセッションの依存関係 ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ルートエンドポイント ---
@app.get("/")
def read_root():
    return {"message": "Welcome to the Refix API"}

# --- Item関連のエンドポイント（既存・変更なし） ---
@app.post("/items/", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    return crud.create_item(db=db, item=item)

@app.get("/items/", response_model=list[schemas.Item])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_items(db, skip=skip, limit=limit)

# --- Project関連のエンドポイント ---
@app.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db=db, project=project)

@app.get("/projects/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.delete("/projects/{project_id}", response_model=schemas.Project)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    db_project = crud.delete_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.get("/projects/", response_model=List[schemas.Project])
def read_projects_by_user(user_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_projects_by_user(db, user_id=user_id, skip=skip, limit=limit)

# --- Review関連のエンドポイント ---
@app.post("/reviews/", response_model=schemas.Review)
def create_review(review: schemas.ReviewCreate, db: Session = Depends(get_db)):
    return crud.create_review(db=db, review=review)

@app.get("/projects/{project_id}/reviews/", response_model=List[schemas.Review])
def read_reviews_for_project(project_id: int, db: Session = Depends(get_db)):
    return crud.get_reviews_by_project(db=db, project_id=project_id)

@app.post("/projects/{project_id}/generate-review", response_model=schemas.Review)
def generate_review_endpoint(project_id: int, db: Session = Depends(get_db)):
    new_review = crud.generate_and_save_review(db, project_id=project_id)
    if not new_review:
        raise HTTPException(status_code=500, detail="Failed to generate or save AI review")
    return new_review

# --- Chat関連のエンドポイント ---
@app.post("/reviews/{review_id}/chat", response_model=schemas.ChatMessage)
def handle_chat_message(review_id: int, request: schemas.ChatRequest, db: Session = Depends(get_db)):
    """
    特定のレビューに関するチャットのメッセージを処理するエンドポイント
    """
    try:
        ai_response = crud.process_chat_message(
            db=db,
            review_id=review_id,
            user_message=request.user_message,
            original_review_context=request.original_review_context
        )
        return ai_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))