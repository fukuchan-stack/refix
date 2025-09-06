/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Next.js 13+ の app ディレクトリも対象に含めます
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}