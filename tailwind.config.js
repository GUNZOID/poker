/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          darkest: '#111214',
          darker: '#1e1f22',
          dark: '#2b2d31',
          light: '#313338',
          lighter: '#383a40',
          blurple: '#5865F2',
          'blurple-hover': '#4752c4',
          green: '#23a55a',
          red: '#f23f43',
          yellow: '#f0b232',
        },
        felt: {
          light: '#2d6a4f',
          DEFAULT: '#1b4332',
          dark: '#143326',
          border: '#386641',
        }
      },
      fontFamily: {
        sans: [
          'gg sans',
          'Noto Sans',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'table': 'inset 0 0 80px rgba(0, 0, 0, 0.6), 0 20px 40px rgba(0, 0, 0, 0.5)',
        'chip': '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4)',
      }
    },
  },
  plugins: [],
}
