/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1A2C38',
        accent: '#FBBB0C',
        'accent-dark': '#E5A800',
        'card': '#0F212E',
        'stake-dark': '#1A2C38',
      },
      fontFamily: {
        'cream-cake': ['Cream Cake', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
