import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
export function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await api.register(email, password);
            const { token } = await api.login(email, password);
            localStorage.setItem('token', token);
            navigate('/');
        }
        catch (e) {
            setError(typeof e?.message === 'string' ? e.message : 'Registration failed');
        }
        setLoading(false);
    }
    return (_jsxs("div", { className: "max-w-sm mx-auto mt-10 p-6 bg-white rounded shadow", children: [_jsx("h1", { className: "text-xl font-semibold mb-4", children: "Register" }), _jsxs("form", { onSubmit: onSubmit, className: "space-y-3", children: [_jsx("input", { type: "email", required: true, value: email, onChange: e => setEmail(e.target.value), placeholder: "Email", className: "w-full border p-2 rounded" }), _jsx("input", { type: "password", required: true, value: password, onChange: e => setPassword(e.target.value), placeholder: "Password", className: "w-full border p-2 rounded" }), error && _jsx("div", { className: "text-red-600 text-sm", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 disabled:bg-blue-400 text-white py-2 rounded", children: loading ? 'Creating...' : 'Create account' })] }), _jsxs("div", { className: "text-sm mt-3", children: ["Have an account? ", _jsx(Link, { to: "/login", className: "text-blue-700", children: "Login" })] })] }));
}
