import React from 'react'
import { useThemeContext } from './ThemeContext'

const ThemeToggle: React.FC = () => {
  const { preference, resolved, setPreference } = useThemeContext()

  // Simplified cycle: light <-> dark (toggle between the two)
  const onClick = () => {
    if (preference === 'light') {
      setPreference('dark')
    } else {
      setPreference('light')
    }
  }

  const label = `Theme: ${resolved === 'light' ? 'Light' : 'Dark'}`

  // Choose visual mode for icon/colors based on resolved theme
  const isDark = resolved === 'dark'

  const baseBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150'

  const btnClass = isDark
    ? `${baseBtn} text-slate-400 hover:text-slate-200 hover:bg-slate-800/60`
    : `${baseBtn} text-slate-500 hover:text-slate-700 hover:bg-slate-100`

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={btnClass}
    >
      {/* Single icon for current (resolved) theme */}
      <div className="relative">
        {resolved === 'light' ? (
          /* Sun icon (light theme) */
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
            <path d="M12 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zM12 18a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4.22 5.22a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM17.66 18.36a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM2 11a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zM20 11a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM4.22 18.78a1 1 0 000 1.42l.7.7a1 1 0 001.42-1.42l-.7-.7a1 1 0 00-1.42 0zM17.66 5.64a1 1 0 000 1.42l.7.7a1 1 0 001.42-1.42l-.7-.7a1 1 0 00-1.42 0zM12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        ) : (
          /* Moon icon (dark theme) */
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </div>
    </button>
  )
}

export default ThemeToggle