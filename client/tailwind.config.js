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
    extend: {
      colors: {
        // Custom near-black dark palette (no blue tint)
        'ui': {
          'bg':       '#090909',   // near-black – main app background
          'surface':  '#111111',   // dark charcoal – cards & panels
          'elevated': '#181818',   // slightly lighter – elevated elements
          'border':   '#1f1f1f',   // subtle border
          'muted':    '#282828',   // muted borders
          'subtle':   '#555555',   // subtle text / disabled
          'secondary':'#888888',   // secondary text
          'primary':  '#f0f0f0',   // primary text
          'accent':   '#3b82f6',   // blue-500  – primary accent
          'accent-hover': '#60a5fa', // blue-400
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        mono: ['Courier New', 'Courier', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.25)',
        'glow-sm':   '0 0 8px rgba(59, 130, 246, 0.15)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
        'card-dark-lg': '0 4px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
      },
      backgroundImage: {
        'grid-dark': "linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)",
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}


