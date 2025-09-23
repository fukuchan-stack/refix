from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

# --- Messageスキーマ ---
class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Conversationスキーマ ---
class ConversationBase(BaseModel):
    title: Optional[str] = None

class ConversationCreate(ConversationBase):
    project_id: int

class Conversation(ConversationBase):
    id: int
    project_id: int
    created_at: datetime
    messages: List[Message] = []

    class Config:
        from_attributes = True

# --- Projectスキーマ ---
class ProjectBase(BaseModel):
    name: str
    github_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    user_id: str

class Project(ProjectBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    display_order: int
    conversations: List[Conversation] = []

    class Config:
        from_attributes = True

# --- 更新・操作用のスキーマ ---
class ProjectUpdate(BaseModel):
    name: str

class ProjectOrderUpdate(BaseModel):
    user_id: str
    ordered_ids: List[int]

class ProjectReorderRequest(BaseModel):
    user_id: str
    sort_by: str

# --- APIリクエスト用のスキーマ ---
class CodeInspectionRequest(BaseModel):
    code: str
    language: Optional[str] = None

class GenerateTestRequest(BaseModel):
    original_code: str
    revised_code: str
    language: str

class RunTestRequest(BaseModel):
    test_code: str
    code_to_test: str
    language: str

class SnykScanRequest(BaseModel):
    code: str
    language: str
    
class ChatRequest(BaseModel):
    chat_history: List[Dict[str, str]]
    project_id: int

# Pydantic v2では、前方参照の解決は通常自動で行われるため、
# model_rebuild()は不要になることが多いですが、循環参照があるため明示的に解決します。
Conversation.model_rebuild()
Project.model_rebuild()