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
      <div className="min-h-full bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100">
        <TopNav />
        <Routes>
          <Route path="/login" element={<div className="mx-auto max-w-7xl p-4"><LoginPage /></div>} />
          <Route path="/register" element={<div className="mx-auto max-w-7xl p-4"><RegisterPage /></div>} />
          <Route path="/" element={<PrivateRoute><div className="mx-auto max-w-7xl p-4"><DashboardPage /></div></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
          <Route path="/assets" element={<PrivateRoute><div className="mx-auto max-w-7xl p-4"><AssetsPage /></div></PrivateRoute>} />
          <Route path="/monthly-summary" element={<PrivateRoute><div className="mx-auto max-w-7xl p-4"><MonthlySummaryPage /></div></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><div className="mx-auto max-w-7xl p-4"><ReportsPage /></div></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><div className="mx-auto max-w-7xl p-4"><SettingsPage /></div></PrivateRoute>} />
          <Route path="/forecast" element={<PrivateRoute><div className="mx-auto max-w-7xl p-4"><ForecastPage /></div></PrivateRoute>} />
        </Routes>
      </div>
    </PrivacyProvider>
  )
}


