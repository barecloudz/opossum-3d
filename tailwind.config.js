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
          black: '#0a0a0a',
          charcoal: '#1a1a1a',
          gray: '#2d2d2d',
          'gray-light': '#404040',
          neon: '#00ff66',
          emerald: '#10b981',
          'emerald-dark': '#064e3b',
        }
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
