# backend/schemas.py

from pydantic import BaseModel
from typing import Optional, List

# --- Item関連のスキーマ（既存） ---
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    class Config:
        from_attributes = True

# --- (ここからが新規追加) ---
# Projectモデルのベーススキーマ
class ProjectBase(BaseModel):
    name: str
    github_url: str

# Project作成用のスキーマ
class ProjectCreate(ProjectBase):
    user_id: str # フロントエンドからユーザーIDを受け取る

# Project読み取り用のスキーマ
class Project(ProjectBase):
    id: int
    user_id: str
    class Config:
        from_attributes = True

# Project読み取り用のスキーマ
class Project(ProjectBase):
    id: int
    user_id: str
    # --- (ここからが更新箇所) ---
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int

    class Config:
        from_attributes = True