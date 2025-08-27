# backend/crud.py

from sqlalchemy.orm import Session
import models
import schemas

# --- 複数のItemを取得する関数 ---
def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TestItem).offset(skip).limit(limit).all()

# --- １つのItemを作成する関数 ---
def create_item(db: Session, item: schemas.ItemCreate):
    # PydanticモデルをSQLAlchemyモデルに変換
    db_item = models.TestItem(name=item.name, description=item.description)
    db.add(db_item) # データベースセッションに追加
    db.commit() # データベースにコミット（書き込み）
    db.refresh(db_item) # 作成されたオブジェクトを更新（IDなどを取得）
    return db_item