from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # funcをインポート

from database import Base

# TestItemモデルは変更なし
class TestItem(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True)

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    github_url = Column(String, unique=True, index=True)
    user_id = Column(String, index=True) # Auth0のユーザーID
    description = Column(String, nullable=True)
    language = Column(String, nullable=True)
    stars = Column(Integer, default=0)

    # ★変更点1: ProjectからReviewへの関連付けを追加
    reviews = relationship("Review", back_populates="project")


# ★変更点2: Reviewモデル(テーブル)をまるごと新規作成
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    review_content = Column(Text, nullable=False) # レビュー本文
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # 作成日時
    
    # ForeignKeyで'projects'テーブルの'id'カラムと紐付け
    project_id = Column(Integer, ForeignKey("projects.id"))

    # ReviewからProjectへの関連付け (多対一の関係)
    project = relationship("Project", back_populates="reviews")