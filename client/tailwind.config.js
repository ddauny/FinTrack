/** @type {import('tailwindcss').Config} */
export default {
  // Use class strategy so adding/removing the `dark` class on <html>
  // toggles dark styles (we set this because ThemeContext toggles the class).
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


