/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // プロキシの対象を、私たちのバックエンドAPI（/projectsで始まるもの）に限定します
        source: '/api/projects/:path*',
        destination: 'http://localhost:8000/projects/:path*',
      },
    ]
  },
}

module.exports = nextConfig