const base = ''; // proxied to server in dev
function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function apiGet(path) {
    const url = path.includes('?') ? `${path}&_t=${Date.now()}` : `${path}?_t=${Date.now()}`;
    const res = await fetch(base + url, { headers: { ...authHeaders() }, cache: 'no-store' });
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}
export async function apiJson(path, method, body) {
    const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok)
        throw new Error(await res.text());
    if (res.status === 204)
        return undefined;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined);
}
export const api = {
    login: (email, password) => apiJson('/api/auth/login', 'POST', { email, password }),
    register: (email, password) => apiJson('/api/auth/register', 'POST', { email, password }),
    dashboardSummary: () => apiGet('/api/dashboard/summary'),
    transactions: {
        list: (q) => apiGet(`/api/transactions${q}`),
        create: (data) => apiJson('/api/transactions', 'POST', data),
        update: (id, data) => apiJson(`/api/transactions/${id}`, 'PUT', data),
        remove: (id) => apiJson(`/api/transactions/${id}`, 'DELETE'),
        importCsv: (file) => {
            const form = new FormData();
            form.append('file', file);
            return fetch('/api/transactions/import', { method: 'POST', headers: { ...authHeaders() }, body: form }).then(r => r.json());
        },
        getNotes: (query) => apiGet(`/api/transactions/notes?q=${encodeURIComponent(query)}`),
    },
    accounts: {
        list: () => apiGet('/api/accounts'),
        create: (data) => apiJson('/api/accounts', 'POST', data),
        update: (id, data) => apiJson(`/api/accounts/${id}`, 'PUT', data),
        remove: (id) => apiJson(`/api/accounts/${id}`, 'DELETE'),
    },
    categories: {
        list: () => apiGet('/api/categories'),
        create: (data) => apiJson('/api/categories', 'POST', data),
        update: (id, data) => apiJson(`/api/categories/${id}`, 'PUT', data),
        remove: (id) => apiJson(`/api/categories/${id}`, 'DELETE'),
    },
    budgets: {
        list: () => apiGet('/api/budgets'),
        create: (data) => apiJson('/api/budgets', 'POST', data),
        update: (id, data) => apiJson(`/api/budgets/${id}`, 'PUT', data),
        remove: (id) => apiJson(`/api/budgets/${id}`, 'DELETE'),
    },
    reports: {
        cashflow: (start, end) => apiGet(`/api/reports/cashflow?start=${start || ''}&end=${end || ''}`),
        spendingByCategory: (start, end) => apiGet(`/api/reports/spending-by-category?start=${start || ''}&end=${end || ''}`),
        trends: (start, end) => apiGet(`/api/reports/trends?start=${start || ''}&end=${end || ''}`),
        test: () => apiGet(`/api/reports/test`),
        monthlyExpenses: (start, end) => apiGet(`/api/reports/monthly-expenses?start=${start || ''}&end=${end || ''}`),
        categoryAnalysis: (start, end) => apiGet(`/api/reports/category-analysis?start=${start || ''}&end=${end || ''}`),
        netWorthTrend: (start, end) => apiGet(`/api/reports/net-worth-trend?start=${start || ''}&end=${end || ''}`),
        exportCsv: (path) => fetch(path + (path.includes('?') ? '&' : '?') + 'format=csv', { headers: { ...authHeaders() } }).then(r => r.text()),
    },
    assets: {
        portfolios: {
            list: () => apiGet('/api/portfolios'),
            create: (name) => apiJson('/api/portfolios', 'POST', { name }),
            rename: (id, name) => apiJson(`/api/portfolios/${id}`, 'PUT', { name }),
            remove: (id) => apiJson(`/api/portfolios/${id}`, 'DELETE'),
            holdings: {
                list: (portfolioId) => apiGet(`/api/portfolios/${portfolioId}/holdings`),
                create: (portfolioId, data) => apiJson(`/api/portfolios/${portfolioId}/holdings`, 'POST', data),
                update: (holdingId, data) => apiJson(`/api/holdings/${holdingId}`, 'PUT', data),
                remove: (holdingId) => apiJson(`/api/holdings/${holdingId}`, 'DELETE'),
            }
        },
        manualAssets: {
            list: () => apiGet('/api/manual-assets'),
            create: (data) => apiJson('/api/manual-assets', 'POST', data),
            update: (id, data) => apiJson(`/api/manual-assets/${id}`, 'PUT', data),
            remove: (id) => apiJson(`/api/manual-assets/${id}`, 'DELETE'),
        },
        marketData: () => apiGet('/api/market-data'),
    },
    settings: {
        profile: () => apiGet('/api/settings/profile'),
        updateProfile: (data) => apiJson('/api/settings/profile', 'PUT', data),
    }
};
