import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AssetsPage } from './pages/AssetsPage';
import { MonthlySummaryPage } from './pages/MonthlySummaryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TopNav } from './components/TopNav';
import { PrivacyProvider } from './contexts/PrivacyContext';
function useAuthToken() {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    useEffect(() => {
        const handler = () => setToken(localStorage.getItem('token'));
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);
    return token;
}
function PrivateRoute({ children }) {
    const token = useAuthToken();
    if (!token)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
export default function App() {
    return (_jsx(PrivacyProvider, { children: _jsxs("div", { className: "min-h-full bg-gray-50", children: [_jsx(TopNav, {}), _jsx("div", { className: "mx-auto max-w-7xl p-4", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsx(Route, { path: "/", element: _jsx(PrivateRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/transactions", element: _jsx(PrivateRoute, { children: _jsx(TransactionsPage, {}) }) }), _jsx(Route, { path: "/assets", element: _jsx(PrivateRoute, { children: _jsx(AssetsPage, {}) }) }), _jsx(Route, { path: "/monthly-summary", element: _jsx(PrivateRoute, { children: _jsx(MonthlySummaryPage, {}) }) }), _jsx(Route, { path: "/reports", element: _jsx(PrivateRoute, { children: _jsx(ReportsPage, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(PrivateRoute, { children: _jsx(SettingsPage, {}) }) })] }) })] }) }));
}
