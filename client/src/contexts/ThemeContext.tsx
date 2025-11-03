import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ThemeResolved = 'light' | 'dark'

const STORAGE_KEY = 'theme-preference'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ThemeResolved
  setPreference: (p: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): ThemeResolved {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch (e) {
    // ignore
  }
  return 'system'
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system'
    return readStoredPreference()
  })

  const [resolved, setResolved] = useState<ThemeResolved>(() => {
    if (typeof window === 'undefined') return 'light'
    return preference === 'system' ? getSystemTheme() : (preference as ThemeResolved)
  })

  useEffect(() => {
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

    const updateResolved = () => {
      const newResolved = preference === 'system' ? getSystemTheme() : (preference as ThemeResolved)
      setResolved(newResolved)
    }

    updateResolved()

    if (!mql) return

    const listener = (e: MediaQueryListEvent | MediaQueryList) => {
      if (preference === 'system') {
        const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches
        setResolved(matches ? 'dark' : 'light')
      }
    }

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', listener as EventListener)
    } else if (typeof mql.addListener === 'function') {
      // @ts-ignore
      mql.addListener(listener)
    }

    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', listener as EventListener)
      } else if (typeof mql.removeListener === 'function') {
        // @ts-ignore
        mql.removeListener(listener)
      }
    }
  }, [preference])

  useEffect(() => {
    try {
      const root = document.documentElement
      if (!root) return
      if (resolved === 'dark') root.classList.add('dark')
      else root.classList.remove('dark')
    } catch (e) {
      // ignore
    }
  }, [resolved])

  const setPreference = useCallback((p: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, p)
    } catch (e) {
      // ignore
    }
    setPreferenceState(p)
  }, [])

  const value: ThemeContextValue = {
    preference,
    resolved,
    setPreference,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}

export default ThemeContext
