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
          neon: 'var(--color-primary, #9AFF00)',
          emerald: 'var(--color-secondary, #7ACC00)',
          'emerald-dark': '#3D6600',
          accent: 'var(--color-accent, #9AFF00)',
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
        'neon': '0 0 15px rgba(154, 255, 0, 0.5)',
        'neon-sm': '0 0 8px rgba(154, 255, 0, 0.4)',
        'neon-lg': '0 0 25px rgba(154, 255, 0, 0.6)',
      }
    },
  },
  plugins: [],
}
