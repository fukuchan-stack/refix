from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
import models
import schemas

# --- Project関連のCRUD関数 ---

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_project_by_github_url(db: Session, github_url: str):
    return db.query(models.Project).filter(models.Project.github_url == github_url).first()

def get_projects_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100, sort_by: str = 'newest'):
    query = db.query(models.Project).filter(models.Project.user_id == user_id)
    if sort_by == 'oldest':
        query = query.order_by(models.Project.created_at.asc())
    elif sort_by == 'name_asc':
        query = query.order_by(models.Project.name.asc())
    elif sort_by == 'name_desc':
        query = query.order_by(models.Project.name.desc())
    else: # default is 'newest'
        query = query.order_by(models.Project.created_at.desc())
    
    return query.offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(
        name=project.name,
        github_url=project.github_url,
        user_id=project.user_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    db_project = get_project(db=db, project_id=project_id)
    if db_project:
        db.delete(db_project)
        db.commit()
    return db_project

def update_project_name(db: Session, project_id: int, name: str):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project:
        db_project.name = name
        db.commit()
        db.refresh(db_project)
    return db_project

def update_projects_order(db: Session, ordered_ids: List[int], user_id: str):
    for index, project_id in enumerate(ordered_ids):
        db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.user_id == user_id
        ).update({"display_order": index})
    db.commit()

def reorder_projects(db: Session, user_id: str, sort_by: str):
    projects = get_projects_by_user(db, user_id=user_id, limit=1000, sort_by=sort_by)
    for index, project in enumerate(projects):
        project.display_order = index
    db.commit()
    return projects


# --- Conversation & Message 関連のCRUD関数 ---

def create_conversation(db: Session, conversation: schemas.ConversationCreate) -> models.Conversation:
    """新しい会話セッションを作成します。"""
    db_conversation = models.Conversation(
        project_id=conversation.project_id,
        title=conversation.title
    )
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def create_message(db: Session, message: schemas.MessageCreate, conversation_id: int) -> models.Message:
    """特定の会話に新しいメッセージを追加します。"""
    db_message = models.Message(
        role=message.role,
        content=message.content,
        conversation_id=conversation_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_latest_conversation_by_project_id(db: Session, project_id: int) -> models.Conversation | None:
    """特定のプロジェクトの最新の会話を取得します。"""
    return db.query(models.Conversation).filter(models.Conversation.project_id == project_id).order_by(models.Conversation.created_at.desc()).first()