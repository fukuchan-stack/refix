from sqlalchemy.orm import Session
import models
import schemas
import os
from github import Github, GithubException
from urllib.parse import urlparse
import ai_partner
import json
from datetime import datetime
from typing import List

# --- Item関連のCRUD関数 ---
def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TestItem).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate):
    db_item = models.TestItem(name=item.name, description=item.description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


# --- Project関連のCRUD関数 ---
def get_projects_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 100, sort_by: str = 'newest'): # sort_by引数を追加
    # この関数を丸ごと置き換えてください
    query = db.query(models.Project).filter(models.Project.user_id == user_id)
    
    # sort_by の値に応じて並び替えを適用
    if sort_by == 'oldest':
        projects = query.order_by(models.Project.id.asc()).offset(skip).limit(limit).all()
    elif sort_by == 'name_asc':
        projects = query.order_by(models.Project.name.asc()).offset(skip).limit(limit).all()
    elif sort_by == 'name_desc':
        projects = query.order_by(models.Project.name.desc()).offset(skip).limit(limit).all()
    else: # デフォルトは 'newest' (作成が新しい順 = sort_order昇順)
        projects = query.order_by(models.Project.sort_order.asc(), models.Project.id.desc()).offset(skip).limit(limit).all()

    # --- 以下、既存のスコア計算ロジック (変更なし) ---
    for project in projects:
        if project.reviews:
            scores = []
            latest_review_date = None
            for review in project.reviews:
                if latest_review_date is None or review.created_at > latest_review_date:
                    latest_review_date = review.created_at
                try:
                    review_content_obj = json.loads(review.review_content)
                    score = review_content_obj.get("overall_score")
                    if isinstance(score, (int, float)):
                        scores.append(score)
                except (json.JSONDecodeError, AttributeError):
                    continue
            project.last_reviewed_at = latest_review_date
            if scores:
                project.average_score = sum(scores) / len(scores)
            else:
                project.average_score = None
        else:
            project.average_score = None
            project.last_reviewed_at = None
    return projects

def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_project_by_github_url(db: Session, github_url: str):
    return db.query(models.Project).filter(models.Project.github_url == github_url).first()

def create_project(db: Session, project: schemas.ProjectCreate):
    repo_info = get_repo_info_from_github(project.github_url)
    description = repo_info["description"] if repo_info else None
    language = repo_info["language"] if repo_info else None
    stars = repo_info["stars"] if repo_info else 0
    
    db.query(models.Project).filter(models.Project.user_id == project.user_id).update({models.Project.sort_order: models.Project.sort_order + 1})
    
    db_project = models.Project(
        name=project.name,
        github_url=project.github_url,
        user_id=project.user_id,
        description=description,
        language=language,
        stars=stars,
        sort_order=0
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
    projects_to_update = db.query(models.Project).filter(
        models.Project.user_id == user_id,
        models.Project.id.in_(ordered_ids)
    ).all()
    project_map = {project.id: project for project in projects_to_update}
    for index, project_id in enumerate(ordered_ids):
        if project_id in project_map:
            project_map[project_id].sort_order = index
    db.commit()
    return {"status": "success"}

def reorder_projects(db: Session, user_id: str, sort_by: str):
    query = db.query(models.Project).filter(models.Project.user_id == user_id)

    if sort_by == 'oldest':
        projects = query.order_by(models.Project.id.asc()).all()
    elif sort_by == 'name_asc':
        projects = query.order_by(models.Project.name.asc()).all()
    elif sort_by == 'name_desc':
        projects = query.order_by(models.Project.name.desc()).all()
    else:
        projects = query.order_by(models.Project.id.desc()).all()

    project_map = {project.id: project for project in projects}
    for index, project in enumerate(projects):
        if project.id in project_map:
            project_map[project.id].sort_order = index
    
    db.commit()
    
    reordered_ids = [p.id for p in projects]
    return db.query(models.Project).filter(models.Project.id.in_(reordered_ids)).order_by(models.Project.sort_order.asc()).all()

def get_repo_info_from_github(github_url: str):
    try:
        github_pat = os.getenv("GITHUB_PAT")
        if not github_pat:
            print("--- DEBUG: WARNING - GITHUB_PAT is not set. Skipping GitHub API call. ---")
            return None
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
def create_review_for_project(db: Session, review: schemas.ReviewCreate, project_id: int):
    review_content_str = review.review_content
    if isinstance(review.review_content, dict):
        review_content_str = json.dumps(review.review_content, ensure_ascii=False)

    db_review = models.Review(
        project_id=project_id,
        review_content=review_content_str,
        code_snippet=review.code_snippet,
        ai_model=review.ai_model,
        language=review.language
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

def generate_review_for_code_snippet(db: Session, project_id: int, code: str, language: str, mode: str) -> models.Review:
    linter_results = "" 

    file_extensions = {
        'python': 'py', 'javascript': 'js', 'typescript': 'ts',
        'html': 'html', 'css': 'css'
    }
    file_extension = file_extensions.get(language, 'txt')
    source_code_dict = {f"pasted_code.{file_extension}": code}

    ai_response_dict = ai_partner.generate_structured_review(
        files=source_code_dict, 
        linter_results=linter_results,
        mode=mode
    )

    review_content_str = json.dumps(ai_response_dict, ensure_ascii=False, indent=2)
    ai_model_name = ai_partner.get_model_name_from_mode(mode)

    review_data = schemas.ReviewCreate(
        review_content=review_content_str,
        project_id=project_id,
        code_snippet=code,
        ai_model=ai_model_name,
        language=language
    )
    new_review = create_review_for_project(db, review_data, project_id)
    return new_review

# --- ChatMessage関連のCRUD関数 ---
def get_chat_messages_by_review(db: Session, review_id: int):
    return db.query(models.ChatMessage).filter(models.ChatMessage.review_id == review_id).order_by(models.ChatMessage.created_at).all()

def create_chat_message(db: Session, review_id: int, role: str, content: str) -> models.ChatMessage:
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
    create_chat_message(db=db, review_id=review_id, role="user", content=user_message)
    chat_history = get_chat_messages_by_review(db=db, review_id=review_id)
    ai_response_text = ai_partner.continue_chat_with_ai(
        chat_history=chat_history,
        user_message=user_message,
        original_review_context=original_review_context
    )
    ai_message = create_chat_message(db=db, review_id=review_id, role="assistant", content=ai_response_text)
    return ai_message