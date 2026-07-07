/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050c0a',
          900: '#081813',
          850: '#0f1e1a',
          800: '#162b25',
          700: '#2a3f38',
          600: '#3b544c',
        },
        cinnabar: {
          500: '#c6301f',
          600: '#9f2418',
          700: '#71180f',
        },
        jade: {
          400: '#4fc9a8',
          500: '#2c9f84',
          600: '#1f7a65',
        },
        gold: {
          400: '#d8c79a',
          500: '#c9b27a',
          600: '#a69058',
        },
        talisman: {
          400: '#d8c79a',
          500: '#c9b27a',
          600: '#a69058',
        },
        wuxing: {
          wood: '#2c9f84',
          fire: '#c6301f',
          earth: '#c9b27a',
          metal: '#e9e4d8',
          water: '#2f4f55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
        serif: ['Noto Serif CJK SC', 'Songti SC', 'SimSun', 'serif'],
      },
      borderRadius: {
        panel: '1.25rem',
        card: '1rem',
      },
      boxShadow: {
        instrument: '0 24px 90px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(44, 159, 132, 0.05)',
        glowJade: '0 0 0 1px rgba(44, 159, 132, 0.22), 0 18px 55px rgba(44, 159, 132, 0.14), 0 0 38px rgba(44, 159, 132, 0.08)',
      },
    },
  },
  plugins: [],
};
