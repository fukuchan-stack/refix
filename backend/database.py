# backend/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# 環境変数からデータベースURLを取得
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# データベースへの接続エンジンを作成
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# データベースセッションを作成するためのクラス
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# データベースモデル（テーブルの定義）を作成するためのベースクラス
Base = declarative_base()

# --- APIがデータベースセッションを取得するための関数 ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()