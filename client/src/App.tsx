import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { AssetsPage } from './pages/AssetsPage'
import { AnalyticsWorkspace } from './pages/AnalyticsWorkspace'
import { SettingsPage } from './pages/SettingsPage'
import { TopNav } from './components/TopNav'
import { PrivacyProvider } from './contexts/PrivacyContext'
import { ToastProvider } from './contexts/ToastContext'
import { AlertProvider } from './contexts/AlertContext'

function useAuthToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  useEffect(() => {
    const handler = () => setToken(localStorage.getItem('token'))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])
  return token
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = useAuthToken()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ToastProvider>
      <AlertProvider>
        <PrivacyProvider>
          <div className="min-h-full bg-white dark:bg-[#090909] text-slate-900 dark:text-[#f0f0f0]">
            <TopNav />
            <div className="w-full">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
                <Route path="/assets" element={<PrivateRoute><AssetsPage /></PrivateRoute>} />
                <Route path="/analytics" element={<PrivateRoute><AnalyticsWorkspace /></PrivateRoute>} />
                <Route path="/reports" element={<Navigate to="/analytics?view=overview" replace />} />
                <Route path="/portfolio" element={<Navigate to="/analytics?view=portfolio" replace />} />
                <Route path="/monthly-summary" element={<Navigate to="/analytics?view=monthly" replace />} />
                <Route path="/trends" element={<Navigate to="/analytics?view=trends" replace />} />
                <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
              </Routes>
            </div>
          </div>
        </PrivacyProvider>
      </AlertProvider>
    </ToastProvider>
  )
}


