from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Item Schemas (Configを更新) ---
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    class Config:
        from_attributes = True

# --- Review Schemas (Configを更新 & chat_messagesを追加) ---
class ReviewBase(BaseModel):
    review_content: str

class ReviewCreate(ReviewBase):
    project_id: int

class Review(ReviewBase):
    id: int
    created_at: datetime
    project_id: int
    chat_messages: List[ChatMessage] = []

    class Config:
        from_attributes = True

# --- Project Schemas (Configを更新) ---
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
    reviews: List[Review] = []

    class Config:
        from_attributes = True

# --- ChatMessage Schemas ---
class ChatMessageBase(BaseModel):
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    review_id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- ChatRequest Schema ---
class ChatRequest(BaseModel):
    user_message: str
    original_review_context: str

# Pydantic v2では不要になることが多いですが、念のため前方参照を解決
Review.model_rebuild()
Project.model_rebuild()