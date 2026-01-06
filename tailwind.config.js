/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Dynamic theme colors (from CSS variables)
          black: 'var(--color-background, #0a0a0a)',
          charcoal: 'var(--color-surface, #1a1a1a)',
          gray: 'var(--color-border, #2d2d2d)',
          'gray-light': '#404040',
          neon: 'var(--color-primary, #00ff66)',
          emerald: 'var(--color-secondary, #10b981)',
          'emerald-dark': '#064e3b',
          accent: 'var(--color-accent, #00ff66)',
        }
      },
      textColor: {
        'theme': 'var(--color-text, #f5f5f5)',
      },
      backgroundColor: {
        'theme-bg': 'var(--color-background, #0a0a0a)',
        'theme-surface': 'var(--color-surface, #1a1a1a)',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 255, 102, 0.5)',
        'neon-sm': '0 0 8px rgba(0, 255, 102, 0.4)',
        'neon-lg': '0 0 25px rgba(0, 255, 102, 0.6)',
      }
    },
  },
  plugins: [],
}
