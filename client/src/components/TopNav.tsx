import { Link, useLocation, useNavigate } from 'react-router-dom'
import { usePrivacy } from '../contexts/PrivacyContext'
import { useState } from 'react'
// AGGIUNTO: Importa il nuovo componente
import { DarkModeBtn } from './DarkModeBtn'

export function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { hideNumbers, toggleNumbers } = usePrivacy()
  const token = localStorage.getItem('token')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // MODIFICATO: Aggiunte classi dark mode per i link
  const link = (to: string, label: string) => (
    <Link to={to} className={`px-3 py-2 rounded ${pathname === to ? 'bg-blue-600 text-white' : 'text-blue-700 dark:text-blue-300 dark:hover:bg-gray-700 hover:bg-blue-100'}`}>{label}</Link>
  )

  // MODIFICATO: Aggiunte classi dark mode per i link mobile
  const mobileLink = (to: string, label: string) => (
    <Link
      to={to}
      onClick={closeMobileMenu}
      className={`block px-4 py-3 text-sm ${pathname === to ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700'}`}
    >
      {label}
    </Link>
  )

  return (
    // MODIFICATO: Aggiunte classi dark mode alla nav
    <nav className="w-full border-b bg-white dark:bg-gray-900 dark:border-gray-700">
      <div className="mx-auto max-w-7xl flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          {/* MODIFICATO: Aggiunte classi dark mode al titolo */}
          <span className="font-bold text-xl text-blue-700 dark:text-blue-300">FinTrack</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          {token && (<>
            {link('/', 'Dashboard')}
            {link('/transactions', 'Transactions')}
            {link('/assets', 'Assets')}
            {link('/monthly-summary', 'Monthly Summary')}
            {link('/reports', 'Reports')}
            {link('/settings', 'Settings')}
            
            {/* AGGIUNTO: Bottone Dark Mode */}
            <DarkModeBtn />
            
            <button
              onClick={toggleNumbers}
              // MODIFICATO: Aggiunte classi dark mode
              className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              title={hideNumbers ? "Show numbers" : "Hide numbers"}
            >
              {hideNumbers ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </button>
            {/* MODIFICATO: Aggiunte classi dark mode */}
            <button onClick={logout} className="ml-2 px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">Logout</button>
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
            // MODIFICATO: Aggiunte classi dark mode
            className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        // MODIFICATO: Aggiunte classi dark mode
        <div className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {token && (<>
              {mobileLink('/', 'Dashboard')}
              {mobileLink('/transactions', 'Transactions')}
              {mobileLink('/assets', 'Assets')}
              {mobileLink('/monthly-summary', 'Monthly Summary')}
              {mobileLink('/reports', 'Reports')}
              {mobileLink('/settings', 'Settings')}
              {/* MODIFICATO: Aggiunte classi dark mode */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
              
              {/* AGGIUNTO: Bottone Dark Mode per mobile */}
              <DarkModeBtn isMobile={true} />

              <button
                onClick={() => { toggleNumbers(); closeMobileMenu(); }}
                // MODIFICATO: Aggiunte classi dark mode
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-gray-700"
              >
                <span className="mr-2">
                  {hideNumbers ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                      <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </span>
                {hideNumbers ? "Show numbers" : "Hide numbers"}
              </button>
              <button
                onClick={() => { logout(); closeMobileMenu(); }}
                // MODIFICATO: Aggiunte classi dark mode
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900"
              >
                Logout
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

