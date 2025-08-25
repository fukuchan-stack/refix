from fastapi import FastAPI
# CORSを許可するためのMiddlewareをインポート
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 許可する接続元のリスト（今回はフロントエンドのURL）
origins = [
    "http://localhost:3000",
]

# CORSミドルウェアを追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # 全てのHTTPメソッドを許可
    allow_headers=["*"], # 全てのHTTPヘッダーを許可
)

@app.get("/")
def read_root():
    return {"message": "Hello from Refix Backend!"}