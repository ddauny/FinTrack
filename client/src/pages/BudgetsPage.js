import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEUR } from '@/lib/format';
export function BudgetsPage() {
    const [items, setItems] = useState([]);
    useEffect(() => {
        api.budgets.list().then((data) => setItems(data));
    }, []);
    return (_jsxs("div", { className: "bg-white p-4 rounded shadow", children: [_jsx("div", { className: "font-semibold mb-4", children: "Budgets" }), _jsx("div", { className: "space-y-3", children: items.map((b) => {
                    const pct = Math.min(100, Math.round((Number(b.spent || 0) / Number(b.amount || 1)) * 100));
                    return (_jsxs("div", { className: "border rounded p-3", children: [_jsxs("div", { className: "flex justify-between text-sm mb-2", children: [_jsxs("div", { children: [b.period, " - Category #", b.categoryId] }), _jsxs("div", { children: [formatEUR(b.spent || 0), " / ", formatEUR(b.amount)] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded h-3", children: _jsx("div", { className: `h-3 rounded ${pct > 100 ? 'bg-red-600' : 'bg-green-600'}`, style: { width: `${pct}%` } }) })] }, b.id));
                }) })] }));
}
