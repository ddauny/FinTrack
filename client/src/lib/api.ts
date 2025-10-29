import type {
  LoginResponse,
  RegisterResponse,
  DashboardSummary,
  Transaction,
  Budget,
  Account,
  Category,
  Portfolio,
  Holding,
  ManualAsset
} from '../types';

const base = '' // proxied to server in dev

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = path.includes('?') ? `${path}&_t=${Date.now()}` : `${path}?_t=${Date.now()}`
  const res = await fetch(base + url, { headers: { ...authHeaders() }, cache: 'no-store' as RequestCache })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiJson<T>(path: string, method: string, body?: any): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as unknown as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  login: (email: string, password: string) => apiJson<LoginResponse>('/api/auth/login', 'POST', { email, password }),
  register: (email: string, password: string) => apiJson<RegisterResponse>('/api/auth/register', 'POST', { email, password }),
  dashboardSummary: () => apiGet<DashboardSummary>('/api/dashboard/summary'),
  transactions: {
    list: (q: string) => apiGet<Transaction[]>(`/api/transactions${q}`),
    create: (data: Partial<Transaction>) => apiJson<Transaction>('/api/transactions', 'POST', data),
    update: (id: number, data: Partial<Transaction>) => apiJson<Transaction>(`/api/transactions/${id}`, 'PUT', data),
    remove: (id: number) => apiJson<void>(`/api/transactions/${id}`, 'DELETE'),
    importCsv: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch('/api/transactions/import', { method: 'POST', headers: { ...authHeaders() }, body: form }).then(r=>r.json())
    },
    getNotes: (query: string) => apiGet(`/api/transactions/notes?q=${encodeURIComponent(query)}`),
  },
  accounts: {
    list: () => apiGet<Account[]>('/api/accounts'),
    create: (data: Partial<Account>) => apiJson<Account>('/api/accounts', 'POST', data),
    update: (id: number, data: Partial<Account>) => apiJson<Account>(`/api/accounts/${id}`, 'PUT', data),
    remove: (id: number) => apiJson<void>(`/api/accounts/${id}`, 'DELETE'),
  },
  categories: {
    list: () => apiGet<Category[]>('/api/categories'),
    create: (data: Partial<Category>) => apiJson<Category>('/api/categories', 'POST', data),
    update: (id: number, data: Partial<Category>) => apiJson<Category>(`/api/categories/${id}`, 'PUT', data),
    remove: (id: number) => apiJson<void>(`/api/categories/${id}`, 'DELETE'),
  },
  budgets: {
    list: () => apiGet<Budget[]>('/api/budgets'),
    create: (data: Partial<Budget>) => apiJson<Budget>('/api/budgets', 'POST', data),
    update: (id: number, data: Partial<Budget>) => apiJson<Budget>(`/api/budgets/${id}`, 'PUT', data),
    remove: (id: number) => apiJson<void>(`/api/budgets/${id}`, 'DELETE'),
  },
    reports: {
      cashflow: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/cashflow?start=${start||''}&end=${end||''}`),
      spendingByCategory: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/spending-by-category?start=${start||''}&end=${end||''}`),
      trends: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/trends?start=${start||''}&end=${end||''}`),
      test: () => apiGet(`/api/reports/test`),
      monthlyExpenses: (start?: string, end?: string) => apiGet(`/api/reports/monthly-expenses?start=${start||''}&end=${end||''}`),
      categoryAnalysis: (start?: string, end?: string) => apiGet(`/api/reports/category-analysis?start=${start||''}&end=${end||''}`),
      netWorthTrend: (start?: string, end?: string) => apiGet(`/api/reports/net-worth-trend?start=${start||''}&end=${end||''}`),
      exportCsv: (path: string) => fetch(path + (path.includes('?')? '&':'?') + 'format=csv', { headers: { ...authHeaders() } }).then(r=>r.text()),
    },
  assets: {
    portfolios: {
      list: () => apiGet<any[]>('/api/portfolios'),
      create: (name: string) => apiJson<any>('/api/portfolios', 'POST', { name }),
      rename: (id: number, name: string) => apiJson<any>(`/api/portfolios/${id}`, 'PUT', { name }),
      remove: (id: number) => apiJson<void>(`/api/portfolios/${id}`, 'DELETE'),
      holdings: {
        list: (portfolioId: number) => apiGet<any[]>(`/api/portfolios/${portfolioId}/holdings`),
        create: (portfolioId: number, data: any) => apiJson<any>(`/api/portfolios/${portfolioId}/holdings`, 'POST', data),
        update: (holdingId: number, data: any) => apiJson<any>(`/api/holdings/${holdingId}`, 'PUT', data),
        remove: (holdingId: number) => apiJson<void>(`/api/holdings/${holdingId}`, 'DELETE'),
      }
    },
    manualAssets: {
      list: () => apiGet<any[]>('/api/manual-assets'),
      create: (data: any) => apiJson<any>('/api/manual-assets', 'POST', data),
      update: (id: number, data: any) => apiJson<any>(`/api/manual-assets/${id}`, 'PUT', data),
      remove: (id: number) => apiJson<void>(`/api/manual-assets/${id}`, 'DELETE'),
    },
    marketData: () => apiGet<any>('/api/market-data'),
  },
  settings: {
    profile: () => apiGet<any>('/api/settings/profile'),
    updateProfile: (data: any) => apiJson<any>('/api/settings/profile', 'PUT', data),
  }
}


