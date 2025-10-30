import { useState, useEffect } from 'react'

// Icona del Sole
const SunIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12H.75m.386-6.364 1.591 1.591M12 12a2.25 2.25 0 0 1-2.25-2.25A2.25 2.25 0 0 1 12 7.5a2.25 2.25 0 0 1 2.25 2.25A2.25 2.25 0 0 1 12 12Z"
    />
  </svg>
)

// Icona della Luna
const MoonIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-6.748Z"
    />
  </svg>
)

/**
 * Un bottone per il toggle del Dark Mode.
 * - `isMobile={true}` lo renderizza come un link testuale per il menu mobile.
 * - `isMobile={false}` (default) lo renderizza come un bottone con icona.
 */
export function DarkModeBtn({ isMobile = false }: { isMobile?: boolean }) {
  // Legge lo stato iniziale dalla <html> (impostato dallo script in index.html)
  const [isDark, setIsDark] = useState(false)

  // Sincronizza lo stato React con il DOM all'avvio
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Funzione per cambiare tema
  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark) // Aggiorna lo stato React

    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // --- Render per Menu Mobile ---
  if (isMobile) {
    return (
      <button
        onClick={toggleTheme}
        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700"
      >
        <span className="mr-2">
          {isDark ? (
            <SunIcon className="w-4 h-4" />
          ) : (
            <MoonIcon className="w-4 h-4" />
          )}
        </span>
        {isDark ? 'Passa a Light Mode' : 'Passa a Dark Mode'}
      </button>
    )
  }

  // --- Render per Desktop (default) ---
  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
      title={isDark ? 'Passa a light mode' : 'Passa a dark mode'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
