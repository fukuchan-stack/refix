/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ▼▼▼ 以下のブロックをここに追加しました ▼▼▼
  // Codespaces環境でFast Refreshを正しく動作させるための設定
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000, // 1秒ごとにファイルの変更を確認
      aggregateTimeout: 300,
    };
    return config;
  },
  // ▲▲▲ ここまで ▲▲▲

  async rewrites() {
    return [
      {
        // このルールは /api/projects/10 や /api/projects/10/inspect のような
        // 詳細なパスを持つリクエスト（パスが1つ以上ある場合）を処理します。
        source: '/api/projects/:path+',
        // ★ 修正点: backendをlocalhostに変更
        destination: 'http://localhost:8000/projects/:path+',
      },
      {
        // このルールは /api/projects (クエリパラメータ付き) のような
        // 一覧取得のためのベースパスへのリクエストを専門に処理します。
        source: '/api/projects',
        // ★ 修正点: backendをlocalhostに変更
        destination: 'http://localhost:8000/projects/',
      },
    ]
  },
}

module.exports = nextConfig