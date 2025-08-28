# backend/main.py

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas, crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORSミドルウェアの設定 ---
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Item関連のエンドポイント（既存） ---
@app.post("/items/", response_model=schemas.Item)
def create_item_endpoint(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    # user_idを渡さないシンプルな形式なので、デモ用に残しておきます
    return crud.create_item(db=db, item=item)

@app.get("/items/", response_model=List[schemas.Item])
def read_items_endpoint(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_items(db, skip=skip, limit=limit)

# --- (ここからが新規追加) ---
# 【重要：セキュリティについて】
# 現在、フロントエンドから送られてくるuser_idをそのまま信じて使用しています。
# これは開発初期段階の簡略化です。将来的には、Auth0が発行するJWT（JSON Web Token）を
# 使って、バックエンド側でユーザーを安全に検証するセキュリティ強化のステップを追加します。

# POST: 新しいProjectを作成するエンドポイント
@app.post("/projects/", response_model=schemas.Project)
def create_project_endpoint(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    # ここではまだ単純に受け取ったuser_idを使用
    return crud.create_project(db=db, project=project)

# GET: 特定ユーザーの全Projectを取得するエンドポイント
@app.get("/projects/", response_model=List[schemas.Project])
def read_projects_endpoint(user_id: str, db: Session = Depends(get_db)):
    projects = crud.get_projects_by_user(db, user_id=user_id)
    return projects