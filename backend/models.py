# backend/models.py

from sqlalchemy import Column, Integer, String, ForeignKey
# from sqlalchemy.orm import relationship # 将来のためにコメントアウトで準備
from database import Base

# TestItemモデルは練習用だったので、このまま残しても、削除してもOKです。
class TestItem(Base):
    __tablename__ = "test_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True, nullable=True)

# --- (ここからが新規追加) ---
# Projectモデルの定義
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    github_url = Column(String, unique=True, index=True) # GitHubリポジトリのURL
    user_id = Column(String, index=True) # プロジェクトを登録したユーザーのID

    # 将来的にはUserモデルとの関連付けもここに記述します
    # owner = relationship("User", back_populates="projects")

    # GitHub APIから取得する追加情報
    description = Column(String, nullable=True) # リポジトリの説明文
    language = Column(String, nullable=True)    # 主要なプログラミング言語
    stars = Column(Integer, default=0)          # スターの数