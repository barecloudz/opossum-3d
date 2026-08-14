/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          // Dynamic theme colors (from CSS variables)
          black: 'var(--color-background, #F2F4F7)',
          charcoal: 'var(--color-surface, #FFFFFF)',
          gray: 'var(--color-border, #C9C9C9)',
          'gray-light': '#E5E7EB',
          neon: 'var(--color-primary, #1677FF)',
          emerald: 'var(--color-secondary, #0a5fd9)',
          'emerald-dark': '#0D1B2A',
          accent: 'var(--color-accent, #1677FF)',
        }
      },
      textColor: {
        'theme': 'var(--color-text, #0D1B2A)',
      },
      backgroundColor: {
        'theme-bg': 'var(--color-background, #F2F4F7)',
        'theme-surface': 'var(--color-surface, #FFFFFF)',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(22, 119, 255, 0.4)',
        'neon-sm': '0 0 8px rgba(22, 119, 255, 0.3)',
        'neon-lg': '0 0 25px rgba(22, 119, 255, 0.5)',
      }
    },
  },
  plugins: [],
}
