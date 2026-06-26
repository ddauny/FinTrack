import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePrivacy } from '../contexts/PrivacyContext'
import { useThemeContext } from '../contexts/ThemeContext'
import { useAlert } from '../contexts/AlertContext'
import { useState } from 'react'
import ThemeToggle from '../contexts/ThemeToggle'

const ChartIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <rect width="32" height="32" rx="8" fill="#2563eb"/>
    <path d="M7 22L13 14L18 18L25 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="25" cy="9" r="2" fill="white"/>
    <circle cx="13" cy="14" r="2" fill="white"/>
    <circle cx="18" cy="18" r="2" fill="white"/>
  </svg>
)

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/assets', label: 'Assets' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
]

export function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { hideNumbers, toggleNumbers } = usePrivacy()
  const { preference, setPreference, resolved } = useThemeContext()
  const { showAlert } = useAlert()
  const token = localStorage.getItem('token')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const logout = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        localStorage.removeItem('token')
        navigate('/login')
      }
    })
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const isActive = (to: string) => {
    if (!pathname || !to) return false
    if (to === '/') return pathname === '/'
    return pathname.startsWith(to)
  }

  if (!token && pathname !== '/login' && pathname !== '/register') {
    // If no token and not on auth pages, we might be in a redirect loop or inconsistent state
    // But App.tsx handles PrivateRoute, so TopNav should just render what it can.
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-[#1f1f1f] bg-white/80 dark:bg-[#090909]/90 backdrop-blur-2xl">
      <div className="w-full relative flex items-center justify-between px-4 sm:px-6 h-13" style={{height:'52px'}}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative">
            <ChartIcon />
            <div className="absolute inset-0 rounded-lg bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-sm" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-[#f0f0f0]">
            Fin<span className="text-blue-500 dark:text-blue-400">Track</span>
          </span>
        </Link>

        {/* Desktop Navigation — centered absolutely */}
        {token && (
          <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive(to)
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                    : 'text-slate-500 dark:text-[#666] hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-[#1a1a1a]'
                }`}
              >
                {label}
                {isActive(to) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full" />
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {token ? (
            <>
              <div className="w-px h-4 bg-slate-200 dark:bg-[#111111] mx-1" />
              <ThemeToggle />
              <button
                onClick={toggleNumbers}
                title={hideNumbers ? 'Show numbers' : 'Hide numbers'}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-all duration-150 ${
                  hideNumbers
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'text-slate-400 dark:text-[#666] hover:bg-slate-100 dark:hover:bg-[#262626] dark:bg-[#1a1a1a] hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {hideNumbers ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-[#666] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150"
                title="Sign out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive('/login') ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-[#888] hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#262626] dark:bg-[#1a1a1a]'}`}>Login</Link>
              <Link to="/register" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm">Register</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-[#888] hover:bg-slate-100 dark:hover:bg-[#262626] dark:bg-[#1a1a1a] transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/60 dark:border-[#1f1f1f] bg-white/95 dark:bg-[#111111]/98 backdrop-blur-xl py-2">
          {token ? (
            <>
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobileMenu}
                  className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive(to)
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10'
                      : 'text-slate-600 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-[#262626] dark:bg-[#1a1a1a]/40'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="border-t border-slate-100 dark:border-[#1f1f1f] my-2 mx-4" />
              <button
                onClick={() => { setPreference(preference === 'light' ? 'dark' : 'light'); closeMobileMenu(); }}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-[#262626] dark:bg-[#1a1a1a]/40 transition-colors"
              >
                <span className="mr-2">
                  {resolved === 'light' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M12 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zM12 18a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4.22 5.22a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM17.66 18.36a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM2 11a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zM20 11a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM4.22 18.78a1 1 0 000 1.42l.7.7a1 1 0 001.42-1.42l-.7-.7a1 1 0 00-1.42 0zM17.66 5.64a1 1 0 000 1.42l.7.7a1 1 0 001.42-1.42l-.7-.7a1 1 0 00-1.42 0zM12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )}
                </span>
                {resolved === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
              <button
                onClick={() => { toggleNumbers(); closeMobileMenu(); }}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-[#262626] dark:bg-[#1a1a1a]/40 transition-colors"
              >
                <span className="mr-2">
                  {hideNumbers ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </span>
                {hideNumbers ? 'Show numbers' : 'Hide numbers'}
              </button>
              <button
                onClick={() => { logout(); closeMobileMenu(); }}
                className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMobileMenu} className="block px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-[#888] hover:bg-slate-50 dark:hover:bg-[#262626] dark:bg-[#1a1a1a]/40">Login</Link>
              <Link to="/register" onClick={closeMobileMenu} className="block px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
