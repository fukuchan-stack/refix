module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // ← こちらが正解でした
    autoprefixer: {},
  },
}