import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        try {
            const { token } = await api.login(email, password);
            localStorage.setItem('token', token);
            navigate('/');
        }
        catch (e) {
            setError('Invalid credentials');
        }
    }
    return (_jsxs("div", { className: "max-w-sm mx-auto mt-10 p-6 bg-white rounded shadow", children: [_jsx("h1", { className: "text-xl font-semibold mb-4", children: "Login" }), _jsxs("form", { onSubmit: onSubmit, className: "space-y-3", children: [_jsx("input", { value: email, onChange: e => setEmail(e.target.value), placeholder: "Email", className: "w-full border p-2 rounded" }), _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "Password", className: "w-full border p-2 rounded" }), error && _jsx("div", { className: "text-red-600 text-sm", children: error }), _jsx("button", { className: "w-full bg-blue-600 text-white py-2 rounded", children: "Sign in" })] }), _jsxs("div", { className: "text-sm mt-3", children: ["No account? ", _jsx(Link, { to: "/register", className: "text-blue-700", children: "Register" })] })] }));
}
