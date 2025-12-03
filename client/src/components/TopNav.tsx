import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePrivacy } from '../contexts/PrivacyContext'
import { useThemeContext } from '../contexts/ThemeContext'
import { useState } from 'react'
import ThemeToggle from '../contexts/ThemeToggle'

export function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { hideNumbers, toggleNumbers } = usePrivacy()
  const { preference, setPreference, resolved } = useThemeContext()
  const token = localStorage.getItem('token')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }
  const link = (to: string, label: string) => (
    <Link 
      to={to} 
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        pathname === to
          ? 'bg-gray-100 text-gray-900 dark:bg-gray-700/50 dark:text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800/50'
      }`}
    >
      {label}
    </Link>
  )
  const mobileLink = (to: string, label: string) => (
    <Link 
      to={to} 
      onClick={closeMobileMenu}
      className={`block px-4 py-3 text-sm font-medium rounded-lg mx-2 transition-colors ${
        pathname === to
          ? 'bg-gray-100 text-gray-900 dark:bg-gray-700/50 dark:text-white'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800/50'
      }`}
    >
      {label}
    </Link>
  )
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-xl tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            FinTrack
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {token && (<>
            {link('/', 'Dashboard')}
            {link('/transactions', 'Transactions')}
            {link('/assets', 'Assets')}
            {link('/monthly-summary', 'Monthly Summary')}
            {link('/reports', 'Reports')}
            {link('/settings', 'Settings')}
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button 
                onClick={toggleNumbers} 
                className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-all"
                title={hideNumbers ? "Show numbers" : "Hide numbers"}
              >
                {hideNumbers ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                )}
              </button>
            </div>
          </>)}
          {!token && (<>
            {link('/login', 'Login')}
            {link('/register', 'Register')}
          </>)}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 border-t dark:border-t-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {token && (<>
              {mobileLink('/', 'Dashboard')}
              {mobileLink('/transactions', 'Transactions')}
              {mobileLink('/assets', 'Assets')}
              {mobileLink('/monthly-summary', 'Monthly Summary')}
              {mobileLink('/reports', 'Reports')}
              {mobileLink('/settings', 'Settings')}
              <div className="border-t border-gray-200 my-2"></div>
              <button 
                onClick={() => { 
                  setPreference(preference === 'light' ? 'dark' : 'light'); 
                  closeMobileMenu(); 
                }}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg mx-2 transition-colors"
              >
                <span className="mr-2">
                  {resolved === 'light' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M12 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zM12 18a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4.22 5.22a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM17.66 18.36a1 1 0 011.42 0l.7.7a1 1 0 11-1.42 1.42l-.7-.7a1 1 0 010-1.42zM2 11a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zM20 11a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM4.22 18.78a1 1 0 000 1.42l.7.7a1 1 0 001.42-1.42l-.7-.7a1 1 0 00-1.42 0zM17.66 5.64a1 1 0 000 1.42l.7.7a1 1 0 001.42-1.42l-.7-.7a1 1 0 00-1.42 0zM12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  )}
                </span>
                {resolved === 'light' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button 
                onClick={() => { toggleNumbers(); closeMobileMenu(); }}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg mx-2 transition-colors"
              >
                <span className="mr-2">
                  {hideNumbers ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}
                </span>
                {hideNumbers ? "Show numbers" : "Hide numbers"}
              </button>
              <button 
                onClick={() => { logout(); closeMobileMenu(); }}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mx-2 transition-colors"
              >
                Sign Out
              </button>
            </>)}
            {!token && (<>
              {mobileLink('/login', 'Login')}
              {mobileLink('/register', 'Register')}
            </>)}
          </div>
        </div>
      )}
    </nav>
  )
}


