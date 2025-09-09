/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ↓↓↓↓ この safelist ブロックを丸ごと追加します ↓↓↓↓
  safelist: [
    'container',
    {
      pattern: /(bg|dark:bg)-(white|gray)-(50|100|800|900)/,
    },
    {
      pattern: /(p|m)(x|y)?-\d+/,
    },
    {
      pattern: /border/,
    },
    {
      pattern: /rounded-(lg|md)/,
    }
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}