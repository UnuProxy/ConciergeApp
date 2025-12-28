// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - luxury gold/champagne palette
        brand: {
          50: '#fdfaf5',
          100: '#f9f0dc',
          200: '#f2ddb3',
          300: '#e9c77f',
          400: '#daa94d',
          500: '#c9922f', // Primary gold
          600: '#a67324',
          700: '#825620',
          800: '#6b4520',
          900: '#5a3b1e',
        },
        // Refined status colors (less aggressive)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Dark slate for sidebar/navbar
        slate: {
          850: '#172033',
          950: '#0a0f1a',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        'card': '0 4px 20px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 12px 40px rgba(15, 23, 42, 0.12)',
        'glow-gold': '0 0 30px rgba(201, 146, 47, 0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
