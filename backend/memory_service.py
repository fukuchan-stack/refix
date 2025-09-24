# backend/memory_service.py

from sentence_transformers import SentenceTransformer
from typing import List
from sqlalchemy.orm import Session
import crud # crudをインポート

print("--- LOADING SentenceTransformer model. This may take a moment on first run... ---")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("--- SentenceTransformer model LOADED. ---")


def generate_embedding(text: str) -> List[float]:
    """
    与えられたテキストからベクトル（embedding）を生成します。
    """
    if not text or not isinstance(text, str):
        return []
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()

# ▼▼▼ 新しい関数を追加 ▼▼▼
def find_relevant_memories(db: Session, project_id: int, user_question: str, limit: int = 3) -> str:
    """
    ユーザーの質問に基づいて、関連性の高い過去の会話（記憶）を検索して整形する。
    """
    print(f"--- DEBUG: Searching memories for project {project_id} with question: {user_question[:100]}... ---")
    
    # 1. ユーザーの質問をベクトル化する
    query_embedding = generate_embedding(user_question)
    if not query_embedding:
        return ""

    # 2. データベースで類似メッセージを検索する
    similar_messages = crud.search_similar_messages(
        db=db, 
        project_id=project_id, 
        query_embedding=query_embedding, 
        limit=limit
    )

    if not similar_messages:
        print("--- DEBUG: No relevant memories found. ---")
        return ""

    # 3. 見つかった記憶をAIが読みやすい形式のテキストに整形する
    formatted_memories = "【参考：過去の関連する会話】\n"
    for msg in reversed(similar_messages): # 新しいものから順に表示
        formatted_memories += f"- {msg.role}: {msg.content}\n"
    
    print(f"--- DEBUG: Found {len(similar_messages)} relevant memories. ---")
    return formatted_memories
# ▲▲▲ ここまで追加 ▲▲▲