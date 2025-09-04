# ベースとなるNode.jsの公式イメージを選択
FROM node:20-alpine

# 仮想環境内でgitコマンドを使えるように、Gitクライアントをインストール
RUN apk update && apk add --no-cache git

# コンテナ内の作業ディレクトリを設定
WORKDIR /app

# ★ 修正点: ビルドの基準点（プロジェクトルート）からの正しいパスを指定
# 依存関係のファイルを先にコピー
COPY frontend/package*.json ./

# 依存関係をインストール
RUN npm install

# ★ 修正点: ビルドの基準点からの正しいパスを指定
# アプリケーションのコードをコピー
COPY frontend/. .

# 3000番ポートを外部に公開
EXPOSE 3000

# コンテナ起動時に実行するデフォルトのコマンド
CMD ["npm", "run", "dev"]