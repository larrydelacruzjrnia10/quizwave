/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // App background layers
        bg: {
          base: '#0f0a2e',
          card: '#1a1040',
          border: '#2d1f6e',
        },
        // Primary accent (indigo family)
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#a5b4fc',
        },
        // Answer tile colours — classic game-show palette
        answer: {
          a: '#e21b3c',
          'a-hover': '#c41535',
          b: '#1368ce',
          'b-hover': '#0f52a6',
          c: '#ffa602',
          'c-hover': '#e69500',
          d: '#26890c',
          'd-hover': '#1f6e0a',
        },
        // Podium medals
        gold: '#ffd700',
        silver: '#c0c0c0',
        bronze: '#cd7f32',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pop': 'pop 0.25s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pop: { '0%': { transform: 'scale(0.9)' }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
