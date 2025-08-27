# backend/models.py

from sqlalchemy import Column, Integer, String
from database import Base # <- ここのドット(.)を削除

class TestItem(Base):
    __tablename__ = "test_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True, nullable=True)