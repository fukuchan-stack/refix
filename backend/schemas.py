from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Item Schemas ---
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    class Config:
        from_attributes = True

# --- Review Schemas ---
class ReviewBase(BaseModel):
    review_content: str

class ReviewCreate(ReviewBase):
    project_id: int
    code_snippet: Optional[str] = None
    ai_model: Optional[str] = None
    language: Optional[str] = None


class Review(ReviewBase):
    id: int
    created_at: datetime
    project_id: int
    chat_messages: List[ChatMessage] = []
    code_snippet: Optional[str] = None
    ai_model: Optional[str] = None
    language: Optional[str] = None


    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    github_url: str

class ProjectCreate(ProjectBase):
    user_id: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: Optional[int] = 0

class Project(ProjectBase):
    id: int
    user_id: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int
    reviews: List[Review] = []
    
    average_score: Optional[float] = None
    last_reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ★★★ ここからが追加箇所 ★★★
# --- ProjectUpdate Schema ---
class ProjectUpdate(BaseModel):
    name: str
# ★★★ 追加はここまで ★★★

# --- ChatMessage Schemas ---
class ChatMessageBase(BaseModel):
    content: str
    role: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    review_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    user_message: str
    original_review_context: str

# --- GenerateReview Schema ---
class GenerateReviewRequest(BaseModel):
    code: str
    language: str
    mode: str

# --- InspectCode Schema ---
class CodeInspectionRequest(BaseModel):
    code: str
    language: str

# --- GenerateTest Schema ---
class GenerateTestRequest(BaseModel):
    original_code: str
    revised_code: str
    language: str

# --- RunTest Schema ---
class RunTestRequest(BaseModel):
    test_code: str
    code_to_test: str

# 前方参照を解決
Review.model_rebuild()
Project.model_rebuild()