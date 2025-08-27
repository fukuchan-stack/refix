# backend/schemas.py

from pydantic import BaseModel
from typing import Optional

# --- Itemモデルのベーススキーマ ---
# 読み取りと作成で共通の属性を定義
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

# --- Item作成用のスキーマ ---
# ItemBaseを継承
class ItemCreate(ItemBase):
    pass

# --- Item読み取り用のスキーマ ---
# ItemBaseを継承し、データベースから読み取る際に必要な属性を追加
class Item(ItemBase):
    id: int

    class Config:
        orm_mode = True # SQLAlchemyモデルをPydanticモデルに変換できるようにする設定