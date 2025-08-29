from sqlalchemy.orm import Session
import models
import schemas
import os
from github import Github, GithubException
from urllib.parse import urlparse
import ai_partner

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

def get_project(db: Session, project_id: int):
    """
    指定されたIDに一致する単一のプロジェクトをデータベースから取得する。
    """
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def create_project(db: Session, project: schemas.ProjectCreate):
    """
    １つのプロジェクトを作成する。（GitHub連携を有効化）
    """
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
    """
    指定されたIDに一致する単一のプロジェクトをデータベースから削除する。
    """
    db_project = get_project(db=db, project_id=project_id)
    if db_project:
        db.delete(db_project)
        db.commit()
    return db_project

def get_repo_info_from_github(github_url: str):
    """
    【注意】この関数は現在、create_project関数内でのみ呼び出されます。
    GitHub APIを叩いて、リポジトリの追加情報を取得するヘルパー関数 (デバッグコード入り)
    """
    print("--- DEBUG: Starting get_repo_info_from_github ---")
    try:
        github_pat = os.getenv("GITHUB_PAT")
        
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


# --- Review関連のCRUD関数 ---

def get_reviews_by_project(db: Session, project_id: int):
    """
    指定されたプロジェクトIDに紐づくレビューの一覧を取得する。
    """
    return db.query(models.Review).filter(models.Review.project_id == project_id).all()

def create_review(db: Session, review: schemas.ReviewCreate):
    """
    １つのレビューを作成する。
    """
    db_review = models.Review(
        review_content=review.review_content,
        project_id=review.project_id
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

def get_file_content_from_github(github_url: str, file_path: str = "README.md") -> str | None:
    """GitHubリポジトリから指定されたファイルの内容を取得する"""
    try:
        github_pat = os.getenv("GITHUB_PAT")
        g = Github(github_pat)
        path = urlparse(github_url).path.strip('/')
        repo = g.get_repo(path)
        
        # ファイルの内容を取得
        file_content = repo.get_contents(file_path)
        # デコードして返す
        return file_content.decoded_content.decode("utf-8")
        
    except Exception as e:
        print(f"--- DEBUG: ERROR - Failed to get file content from GitHub: {e} ---")
        return None

def generate_and_save_review(db: Session, project_id: int) -> models.Review | None:
    """AIレビューを生成し、データベースに保存する一連の流れを実行する"""
    # 1. プロジェクト情報を取得
    project = get_project(db, project_id)
    if not project:
        return None

    # 2. GitHubからファイル内容を取得 (今回はREADME.mdを対象)
    file_content = get_file_content_from_github(project.github_url, "README.md")
    if not file_content:
        return None

    # 3. AI担当官にレビューを依頼
    ai_response_text = ai_partner.get_ai_review_for_file(file_content)

    # 4. レビュー結果をDBに保存するための準備
    review_data = schemas.ReviewCreate(
        review_content=ai_response_text,
        project_id=project_id
    )

    # 5. DBに保存
    new_review = create_review(db, review_data)
    
    return new_review