/** @type {import('tailwindcss').Config} */
export default {
  // Ho aggiunto questa riga per abilitare la strategia "class"
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
