/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ★★★ 変更点①: webpackDevMiddleware の設定を削除 ★★★
  // Next.js 14.2.5 ではこの設定は不要、または別の方法が推奨されるため警告が出ていました。
  // 現在の開発環境ではこれがなくてもホットリロードは機能するはずです。

  async rewrites() {
    return [
      // ★★★ 変更点②: 新しいテスト生成APIのための中継ルールを追加 ★★★
      {
        source: '/api/tests/generate',
        destination: 'http://localhost:8000/api/tests/generate',
      },
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