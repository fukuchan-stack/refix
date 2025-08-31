from sqlalchemy.orm import Session
import models
import schemas
import os
from github import Github, GithubException
from urllib.parse import urlparse
import ai_partner
import json
import linter

# --- Item関連のCRUD関数（既存・変更なし） ---
def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TestItem).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate):
    db_item = models.TestItem(name=item.name, description=item.description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


# --- Project関連のCRUD関数 ---
def get_projects_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.Project).filter(models.Project.user_id == user_id).offset(skip).limit(limit).all()

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(
        name=project.name,
        github_url=project.github_url,
        user_id=project.user_id
    )
    repo_info = get_repo_info_from_github(project.github_url)
    if repo_info:
        db_project.description = repo_info["description"]
        db_project.language = repo_info["language"]
        db_project.stars = repo_info["stars"]
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

def get_repo_info_from_github(github_url: str):
    try:
        github_pat = os.getenv("GITHUB_PAT")
        g = Github(github_pat)
        path = urlparse(github_url).path.strip('/')
        repo = g.get_repo(path)
        return {
            "description": repo.description,
            "language": repo.language,
            "stars": repo.stargazers_count,
        }
    except GithubException as e:
        print(f"--- DEBUG: ERROR - Failed to fetch repo info from GitHub: {e} ---")
        return None

# --- Review関連のCRUD関数 ---
def get_reviews_by_project(db: Session, project_id: int):
    return db.query(models.Review).filter(models.Review.project_id == project_id).all()

def create_review(db: Session, review: schemas.ReviewCreate):
    db_review = models.Review(
        review_content=review.review_content,
        project_id=review.project_id
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

def generate_review_for_code_snippet(db: Session, project_id: int, code: str, language: str) -> models.Review:
    """AIレビューをコード片に対して生成し、データベースに保存する"""
    
    linter_results = "No linter available for this language."
    # 今後、他の言語のLinterを追加する場合はここに追記
    if language == 'python':
        print(f"--- DEBUG: Found Python code, sending to linter ---")
        result = linter.run_flake8_on_code(code)
        if "Success" not in result:
            linter_results = f"--- Issues found by Flake8 ---\n{result}"
        else:
            linter_results = "Success: No issues found by Flake8."

    # ファイル名を擬似的に作成してAIに渡す
    file_extensions = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'html': 'html',
        'css': 'css'
    }
    file_extension = file_extensions.get(language, 'txt')
    source_code_dict = {f"pasted_code.{file_extension}": code}

    ai_response_dict = ai_partner.get_ai_review_for_files(
        files=source_code_dict, 
        linter_results=linter_results
    )

    review_content_str = json.dumps(ai_response_dict, ensure_ascii=False, indent=2)

    review_data = schemas.ReviewCreate(
        review_content=review_content_str,
        project_id=project_id
    )

    new_review = create_review(db, review_data)
    
    return new_review

# --- ChatMessage関連のCRUD関数 ---
def get_chat_messages_by_review(db: Session, review_id: int):
    """指定されたレビューIDに紐づくチャット履歴を取得する"""
    return db.query(models.ChatMessage).filter(models.ChatMessage.review_id == review_id).order_by(models.ChatMessage.created_at).all()

def create_chat_message(db: Session, review_id: int, role: str, content: str) -> models.ChatMessage:
    """１つのチャットメッセージを作成する"""
    db_chat_message = models.ChatMessage(
        review_id=review_id,
        role=role,
        content=content
    )
    db.add(db_chat_message)
    db.commit()
    db.refresh(db_chat_message)
    return db_chat_message

def process_chat_message(db: Session, review_id: int, user_message: str, original_review_context: str) -> models.ChatMessage:
    """ユーザーからのチャットメッセージを処理し、AIの応答を生成・保存する"""
    # 1. ユーザーの発言をDBに記録
    create_chat_message(db=db, review_id=review_id, role="user", content=user_message)

    # 2. これまでの会話履歴を全て取得
    chat_history = get_chat_messages_by_review(db=db, review_id=review_id)

    # 3. AI担当官に対話を依頼
    ai_response_text = ai_partner.continue_chat_with_ai(
        chat_history=chat_history,
        user_message=user_message,
        original_review_context=original_review_context
    )

    # 4. AIの返答をDBに記録
    ai_message = create_chat_message(db=db, review_id=review_id, role="assistant", content=ai_response_text)

    # 5. 最新のAIの返答を返す
    return ai_message