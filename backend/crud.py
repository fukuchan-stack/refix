# backend/crud.py の全文
from sqlalchemy.orm import Session
import models
import schemas
import os
from github import Github, GithubException
from urllib.parse import urlparse
import ai_partner
import json
import linter

def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TestItem).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate):
    db_item = models.TestItem(name=item.name, description=item.description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

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
    print("--- DEBUG: Starting get_repo_info_from_github ---")
    try:
        github_pat = os.getenv("GITHUB_PAT")
        if github_pat:
            g = Github(github_pat)
        else:
            g = Github()
        path = urlparse(github_url).path.strip('/')
        repo = g.get_repo(path)
        return {
            "description": repo.description,
            "language": repo.language,
            "stars": repo.stargazers_count,
        }
    except GithubException as e:
        return None
    finally:
        print("--- DEBUG: Finished get_repo_info_from_github ---")

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

def get_source_code_from_github(github_url: str) -> dict[str, str] | None:
    print("--- DEBUG: Starting to fetch source code from GitHub ---")
    try:
        github_pat = os.getenv("GITHUB_PAT")
        g = Github(github_pat)
        path = urlparse(github_url).path.strip('/')
        repo = g.get_repo(path)
        
        # 'linter-test'ブランチの最新のコミットID(SHA)を直接取得する
        main_branch = repo.get_branch("linter-test") # ★ "linter-test" になっていることを確認
        latest_sha = main_branch.commit.sha
        print(f"--- DEBUG: Using latest commit SHA from linter-test branch: {latest_sha[:7]} ---")

        contents = repo.get_contents("", ref=latest_sha)
        
        print("--- SUPER DEBUG: Full content list from GitHub ---")
        for item in contents:
            print(f"--- SUPER DEBUG: Found item: {item.path} (type: {item.type}) ---")
        print("--------------------------------------------------")

        source_files = {}
        allowed_extensions = ['.py', '.js', '.ts', '.tsx', '.html', '.css', '.md', 'Dockerfile', '.yml', '.json']
        
        for content_file in contents:
            if content_file.type == 'file' and any(content_file.name.endswith(ext) for ext in allowed_extensions):
                if content_file.size > 20000:
                    print(f"--- DEBUG: Skipping large file: {content_file.path} ---")
                    continue
                try:
                    source_files[content_file.path] = content_file.decoded_content.decode("utf-8")
                    print(f"--- DEBUG: Fetched file: {content_file.path} ---")
                except Exception as decode_error:
                    print(f"--- DEBUG: Could not decode file: {content_file.path}, Error: {decode_error} ---")
        
        return source_files

    except Exception as e:
        print(f"--- DEBUG: ERROR - Failed to get source code from GitHub: {e} ---")
        return None

def generate_and_save_review(db: Session, project_id: int) -> models.Review | None:
    project = get_project(db, project_id)
    if not project:
        return None
    source_code_dict = get_source_code_from_github(project.github_url)
    if not source_code_dict:
        error_content = json.dumps({
            "overall_score": 0,
            "panels": [{"category": "Error", "title": "ソースコード取得失敗", "details": "GitHubからレビュー対象のソースコードを取得できませんでした。"}]
        })
        error_review_data = schemas.ReviewCreate(review_content=error_content, project_id=project_id)
        return create_review(db, error_review_data)
    linter_results = ""
    for filename, content in source_code_dict.items():
        if filename.endswith('.py'):
            print(f"--- DEBUG: Found Python file, sending to linter: {filename} ---")
            result = linter.run_flake8_on_code(content)
            if "Success" not in result:
                linter_results += f"--- Issues in {filename} ---\n{result}\n"
    if not linter_results:
        linter_results = "No issues found by Flake8."
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