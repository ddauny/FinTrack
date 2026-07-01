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

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = path.includes('?') ? `${path}&_t=${Date.now()}` : `${path}?_t=${Date.now()}`
  const res = await fetch(base + url, { headers: { ...authHeaders() }, cache: 'no-store' as RequestCache })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function apiJson<T>(path: string, method: string, body?: any): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as unknown as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function apiMultipart<T>(path: string, method: string, body: FormData): Promise<T> {
  const res = await fetch(base + path, {
    method,
    headers: { ...authHeaders() },
    body,
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
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
    create: (data: any) => apiJson<Transaction>('/api/transactions', 'POST', data),
    update: (id: number, data: any) => apiJson<Transaction>(`/api/transactions/${id}`, 'PUT', data),
    remove: (id: number) => apiJson<void>(`/api/transactions/${id}`, 'DELETE'),
    bulkDelete: (ids: number[]) => apiJson<{ deleted: number }>('/api/transactions/bulk-delete', 'POST', { ids }),
    bulkUpdateCategory: (ids: number[], categoryId: number) => apiJson<{ updated: number }>('/api/transactions/bulk-update-category', 'PATCH', { ids, categoryId }),
    importCsv: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch('/api/transactions/import', { method: 'POST', headers: { ...authHeaders() }, body: form }).then(async r => {
        if (r.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
          throw new Error('Unauthorized')
        }
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
    },
    getNotes: (query: string) => apiGet(`/api/transactions/notes?q=${encodeURIComponent(query)}`),
    getTags: (query: string) => apiGet<string[]>(`/api/transactions/tags?q=${encodeURIComponent(query)}`),
    aiQuery: (prompt: string) => apiJson<{ items: any[], filterApplied: any }>('/api/transactions/ai-query', 'POST', { prompt }),
    parseScreenshot: (files: File[]) => {
      const form = new FormData()
      for (const file of files) {
        form.append('screenshots', file)
      }
      return apiMultipart<{ transactions: any[] }>('/api/transactions/parse-screenshot', 'POST', form)
    },
    bulkCreate: (transactions: any[]) => apiJson<{ createdCount: number, items: any[] }>('/api/transactions/bulk-create', 'POST', { transactions }),
    exportJson: () => apiGet<any[]>('/api/transactions/export-json'),
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
      portfolioAnalytics: (start?: string, end?: string) => apiGet<any>(`/api/reports/portfolio-analytics?start=${start||''}&end=${end||''}`),
      periodTotals: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/period-totals?start=${start||''}&end=${end||''}`),
      cashflow: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/cashflow?start=${start||''}&end=${end||''}`),
      spendingByCategory: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/spending-by-category?start=${start||''}&end=${end||''}`),
      trends: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/trends?start=${start||''}&end=${end||''}`),
      netWorthTrend: (start?: string, end?: string) => apiGet(`/api/reports/net-worth-trend?start=${start||''}&end=${end||''}`),
      monthlyExpenses: (start?: string, end?: string) => apiGet(`/api/reports/monthly-expenses?start=${start||''}&end=${end||''}`),
      categoryAnalysis: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/category-analysis?start=${start||''}&end=${end||''}`),
      tagAnalysis: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/tag-analysis?start=${start||''}&end=${end||''}`),
      assetGrowthTrend: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/asset-growth-trend?start=${start||''}&end=${end||''}`),
      assetDistribution: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/asset-distribution?start=${start||''}&end=${end||''}`),
      assetGroupComparison: (start?: string, end?: string) => apiGet<any>(`/api/reports/asset-group-comparison?start=${start||''}&end=${end||''}`),
      topAssetsEvolution: (start?: string, end?: string, limit?: number) => apiGet<any>(`/api/reports/top-assets-evolution?start=${start||''}&end=${end||''}&limit=${limit||5}`),
      assetAllocationChanges: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/asset-allocation-changes?start=${start||''}&end=${end||''}`),
      monthlyCategoryTrends: (start?: string, end?: string) => apiGet<any[]>(`/api/reports/monthly-category-trends?start=${start||''}&end=${end||''}`),
      aiChat: (prompt: string) => apiJson<{markdownText: string, widgets?: any[]}>('/api/reports/ai-chat', 'POST', { prompt }),
      exportCsv: (path: string) => fetch(path + (path.includes('?')? '&':'?') + 'format=csv', { headers: { ...authHeaders() } }).then(async r => {
        if (r.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
          throw new Error('Unauthorized')
        }
        return r.text()
      }),
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
    getAutomationToken: () => apiGet<{ token: string | null }>('/api/settings/automation-token'),
    generateAutomationToken: () => apiJson<{ token: string }>('/api/settings/automation-token', 'POST', {}),
  },
  recurringTransactions: {
    list: () => apiGet<any[]>('/api/recurring-transactions'),
    create: (data: any) => apiJson<any>('/api/recurring-transactions', 'POST', data),
    update: (id: number, data: any) => apiJson<any>(`/api/recurring-transactions/${id}`, 'PATCH', data),
    remove: (id: number) => apiJson<void>(`/api/recurring-transactions/${id}`, 'DELETE'),
  }
}


