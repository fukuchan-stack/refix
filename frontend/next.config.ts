/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // このルールは /api/projects/10 や /api/projects/10/inspect のような
        // 詳細なパスを持つリクエスト（パスが1つ以上ある場合）を処理します。
        source: '/api/projects/:path+',
        destination: 'http://localhost:8000/projects/:path+',
      },
      {
        // このルールは /api/projects (クエリパラメータ付き) のような
        // 一覧取得のためのベースパスへのリクエストを専門に処理します。
        source: '/api/projects',
        destination: 'http://localhost:8000/projects/',
      },
    ]
  },
}

module.exports = nextConfig