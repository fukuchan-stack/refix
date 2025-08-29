# backend/crud.py

from sqlalchemy.orm import Session
import models
import schemas
import os
from github import Github, GithubException
from urllib.parse import urlparse

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
    """
    指定されたユーザーIDに紐づくプロジェクトの一覧を取得する
    """
    return db.query(models.Project).filter(models.Project.user_id == user_id).offset(skip).limit(limit).all()

def get_repo_info_from_github(github_url: str):
    """
    【注意】この関数は現在、下のcreate_project関数内でコメントアウトされており、呼び出されません。
    GitHub APIを叩いて、リポジトリの追加情報を取得するヘルパー関数 (デバッグコード入り)
    """
    print("--- DEBUG: Starting get_repo_info_from_github ---")
    try:
        github_pat = os.getenv("GITHUB_PAT")
        
        # --- DEBUG: GITHUB_PATが読み込まれているか確認 ---
        if github_pat:
            print(f"--- DEBUG: GITHUB_PAT loaded, starting with 'ghp_{github_pat[4:8]}...' ---")
            g = Github(github_pat)
        else:
            print("--- DEBUG: GITHUB_PAT not found. Using unauthenticated client. ---")
            g = Github()
        
        path = urlparse(github_url).path.strip('/')
        print(f"--- DEBUG: Attempting to get repo for path: '{path}' ---")
        
        repo = g.get_repo(path)
        
        print(f"--- DEBUG: Successfully fetched repo object. Name: {repo.name}, Lang: {repo.language} ---")
        
        return {
            "description": repo.description,
            "language": repo.language,
            "stars": repo.stargazers_count,
        }
    except GithubException as e:
        print(f"--- DEBUG: ERROR - Failed to fetch repo info from GitHub: {e} ---")
        return None
    finally:
        print("--- DEBUG: Finished get_repo_info_from_github ---")


def create_project(db: Session, project: schemas.ProjectCreate):
    """
    １つのプロジェクトを作成する。（GitHub連携は一時的に無効化）
    """
    db_project = models.Project(
        name=project.name,
        github_url=project.github_url,
        user_id=project.user_id
        # description, language, stars はDBのデフォルト値(nullや0)のままにする
    )
    
    # --- GitHub API連携が成功するまで、この部分を一時的にコメントアウト ---
    # repo_info = get_repo_info_from_github(project.github_url)
    # if repo_info:
    #     db_project.description = repo_info["description"]
    #     db_project.language = repo_info["language"]
    #     db_project.stars = repo_info["stars"]
    # ----------------------------------------------------------------

    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


# ▼▼▼ ここから追加 ▼▼▼
def get_project(db: Session, project_id: int):
    """
    指定されたIDに一致する単一のプロジェクトをデータベースから取得する。
    """
    return db.query(models.Project).filter(models.Project.id == project_id).first()
# ▲▲▲ ここまで追加 ▲▲▲

# ファイルの末尾に追加

def delete_project(db: Session, project_id: int):
    """
    指定されたIDに一致する単一のプロジェクトをデータベースから削除する。
    """
    # まず、削除対象のプロジェクトが存在するか確認 (get_project関数を再利用！)
    db_project = get_project(db=db, project_id=project_id)
    
    if db_project:
        db.delete(db_project)
        db.commit()
    
    return db_project