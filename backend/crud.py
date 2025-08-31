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

def get_source_code_from_github(github_url: str) -> dict[str, str] | None:
    """GitHubリポジトリから主要なソースコードファイルを再帰的に取得する (キャッシュ回避策込み)"""
    print("--- DEBUG: Starting to fetch source code from GitHub (recursively with SHA) ---")
    try:
        github_pat = os.getenv("GITHUB_PAT")
        g = Github(github_pat)
        path = urlparse(github_url).path.strip('/')
        repo = g.get_repo(path)

        main_branch = repo.get_branch("main")
        latest_sha = main_branch.commit.sha
        print(f"--- DEBUG: Using latest commit SHA from main branch: {latest_sha[:7]} ---")
        
        contents = repo.get_contents("", ref=latest_sha)

        source_files = {}
        allowed_extensions = ['.py', '.js', '.ts', '.tsx', '.html', '.css', '.md', 'Dockerfile', '.yml', '.json']
        
        contents_queue = list(contents)
        while contents_queue:
            file_content = contents_queue.pop(0)
            if file_content.type == "dir":
                if len(file_content.path) < 100:
                    contents_queue.extend(repo.get_contents(file_content.path, ref=latest_sha))
            else:
                if any(file_content.path.endswith(ext) for ext in allowed_extensions):
                    if file_content.size > 20000:
                        print(f"--- DEBUG: Skipping large file: {file_content.path} ---")
                        continue
                    try:
                        source_files[file_content.path] = file_content.decoded_content.decode("utf-8")
                        print(f"--- DEBUG: Fetched file: {file_content.path} ---")
                    except Exception as decode_error:
                        print(f"--- DEBUG: Could not decode file: {file_content.path}, Error: {decode_error} ---")

        return source_files
    except Exception as e:
        print(f"--- DEBUG: ERROR - Failed to get source code from GitHub: {e} ---")
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

def generate_review_for_code_snippet(db: Session, project_id: int, code: str, language: str, mode: str) -> models.Review:
    """AIレビューをコード片に対して生成し、データベースに保存する"""
    
    linter_results = "No linter available for this language."
    if language == 'python':
        print(f"--- DEBUG: Found Python code, sending to linter ---")
        result = linter.run_flake8_on_code(code)
        if "Success" not in result:
            linter_results = f"--- Issues found by Flake8 ---\n{result}"
        else:
            linter_results = "Success: No issues found by Flake8."

    file_extensions = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'html': 'html',
        'css': 'css'
    }
    file_extension = file_extensions.get(language, 'txt')
    source_code_dict = {f"pasted_code.{file_extension}": code}

    ai_response_dict = ai_partner.generate_structured_review(
        files=source_code_dict, 
        linter_results=linter_results,
        mode=mode
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
    create_chat_message(db=db, review_id=review_id, role="user", content=user_message)
    chat_history = get_chat_messages_by_review(db=db, review_id=review_id)
    ai_response_text = ai_partner.continue_chat_with_ai(
        chat_history=chat_history,
        user_message=user_message,
        original_review_context=original_review_context
    )
    ai_message = create_chat_message(db=db, review_id=review_id, role="assistant", content=ai_response_text)
    return ai_message