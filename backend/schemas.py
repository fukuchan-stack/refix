from __future__ import annotations # ★変更点1: 未来のPythonの挙動を先取りするおまじない
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional # Optionalをインポート

# --- Item Schemas (変更なし) ---
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    class Config:
        orm_mode = True


# --- Review Schemas (★変更点2: まるごと新規作成) ---
class ReviewBase(BaseModel):
    review_content: str

class ReviewCreate(ReviewBase):
    project_id: int

class Review(ReviewBase):
    id: int
    created_at: datetime
    project_id: int
    
    class Config:
        orm_mode = True


# --- Project Schemas (★変更点3: reviewsフィールドを追加) ---
class ProjectBase(BaseModel):
    name: str
    github_url: str

class ProjectCreate(ProjectBase):
    user_id: str

class Project(ProjectBase):
    id: int
    user_id: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int
    reviews: List[Review] = [] # Projectに紐づくReviewのリスト

    class Config:
        orm_mode = True