/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0e1a',
          card:    '#0f1629',
          hover:   '#141d35',
          border:  '#1e2d4a',
          muted:   '#0d1220',
        },
        bull:  { DEFAULT: '#00c853', dim: 'rgba(0,200,83,0.12)'  },
        bear:  { DEFAULT: '#ff1744', dim: 'rgba(255,23,68,0.12)' },
        warn:  { DEFAULT: '#ffd600', dim: 'rgba(255,214,0,0.12)' },
        info:  { DEFAULT: '#40c4ff', dim: 'rgba(64,196,255,0.12)' },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
