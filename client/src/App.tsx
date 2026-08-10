import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { AssetsPage } from './pages/AssetsPage'
import { MonthlySummaryPage } from './pages/MonthlySummaryPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ForecastPage } from './pages/ForecastPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { TopNav } from './components/TopNav'
import { PrivacyProvider } from './contexts/PrivacyContext'

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
    <PrivacyProvider>
      <div className="h-full overflow-hidden bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 flex flex-col">
        <TopNav />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/login" element={<div className="h-full overflow-y-auto hide-scrollbar"><div className="mx-auto max-w-7xl p-4"><LoginPage /></div></div>} />
            <Route path="/register" element={<div className="h-full overflow-y-auto hide-scrollbar"><div className="mx-auto max-w-7xl p-4"><RegisterPage /></div></div>} />
            <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
            <Route path="/assets" element={<PrivateRoute><AssetsPage /></PrivateRoute>} />
            <Route path="/monthly-summary" element={<PrivateRoute><MonthlySummaryPage /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
            <Route path="/forecast" element={<PrivateRoute><ForecastPage /></PrivateRoute>} />
            <Route path="/subscriptions" element={<PrivateRoute><SubscriptionsPage /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </PrivacyProvider>
  )
}


