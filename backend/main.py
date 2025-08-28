# backend/main.py

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
import crud, models, schemas
from database import SessionLocal, engine
from fastapi.middleware.cors import CORSMiddleware

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORSミドルウェアの設定 ---
origins = [
    "http://localhost:3000",  # Next.jsフロントエンド
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
    items = crud.get_items(db, skip=skip, limit=limit)
    return items

# --- Project関連のエンドポイント ---
@app.post("/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db=db, project=project)

# ▼▼▼ ここから追加 ▼▼▼
@app.get("/projects/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(get_db)):
    """
    指定されたIDを持つ単一のプロジェクトを取得するエンドポイント。
    """
    db_project = crud.get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project
# ▲▲▲ ここまで追加 ▲▲▲

@app.get("/projects/", response_model=list[schemas.Project])
def read_projects_by_user(user_id: str, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    指定されたuser_idに紐づくプロジェクトの一覧を取得するエンドポイント。
    """
    projects = crud.get_projects_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return projects