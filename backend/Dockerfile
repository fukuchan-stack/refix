# 1. ベースとなる公式のPythonイメージを選択
FROM python:3.11-slim

# 2. コンテナ内での作業ディレクトリを指定
WORKDIR /app

# 3. 必要なライブラリ一覧をコンテナにコピー
COPY requirements.txt .

# 4. requirements.txtを元にライブラリをインストール
RUN pip install --no-cache-dir -r requirements.txt

# 5. backendフォルダの中身を全てコンテナにコピー
COPY . .

# 6. コンテナ起動時にこのコマンドを実行してサーバーを起動
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]