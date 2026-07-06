/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050806',
          900: '#07100c',
          850: '#0f1814',
          800: '#15221c',
          700: '#344337',
        },
        cinnabar: {
          500: '#c6301f',
          600: '#9f2418',
          700: '#71180f',
        },
        jade: {
          500: '#159b6e',
          600: '#0d7655',
        },
        talisman: {
          500: '#dbb053',
          600: '#b88b2e',
        },
        wuxing: {
          wood: '#2a9d8f',
          fire: '#e76f51',
          earth: '#dbb053',
          metal: '#e5e5e5',
          water: '#173a47',
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
        instrument: '0 24px 90px rgba(0, 0, 0, 0.46), 0 0 0 1px rgba(219, 176, 83, 0.04)',
        glowJade: '0 0 0 1px rgba(21, 155, 110, 0.24), 0 18px 55px rgba(21, 155, 110, 0.12), 0 0 38px rgba(219, 176, 83, 0.06)',
      },
    },
  },
  plugins: [],
};
