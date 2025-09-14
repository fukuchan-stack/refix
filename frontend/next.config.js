/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/api/tests/generate',
        destination: 'http://localhost:8000/api/tests/generate',
      },
      // ▼▼▼ このブロックを追加 ▼▼▼
      {
        source: '/api/tests/run',
        destination: 'http://localhost:8000/api/tests/run',
      },
      // ▲▲▲ ここまで ▲▲▲
      {
        // デモ用の公開APIへのリクエストをバックエンドに転送するルール
        source: '/api/inspect/public',
        destination: 'http://localhost:8000/inspect/public',
      },
      {
        // /api/projects/10 や /api/projects/10/inspect のようなパスを持つリクエストを処理
        source: '/api/projects/:path+',
        destination: 'http://localhost:8000/projects/:path+',
      },
      {
        // /api/projects (一覧取得) へのリクエストを処理
        source: '/api/projects',
        destination: 'http://localhost:8000/projects/',
      },
    ]
  },
}

module.exports = nextConfig