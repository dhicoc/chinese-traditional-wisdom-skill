/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#121212',
          900: '#1a1c1e',
          850: '#1e1e24',
          800: '#25262b',
          700: '#2d2f36',
        },
        cinnabar: {
          500: '#ae2012',
          600: '#8f1b12',
          700: '#68150f',
        },
        jade: {
          500: '#0a9396',
          600: '#08787a',
        },
        wuxing: {
          wood: '#2a9d8f',
          fire: '#e76f51',
          earth: '#e9c46a',
          metal: '#e5e5e5',
          water: '#264653',
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
        instrument: '0 24px 80px rgba(0, 0, 0, 0.34)',
        glowJade: '0 0 0 1px rgba(10, 147, 150, 0.18), 0 18px 50px rgba(10, 147, 150, 0.08)',
      },
    },
  },
  plugins: [],
};
