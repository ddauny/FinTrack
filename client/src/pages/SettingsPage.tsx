import React, { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

// Icons
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z" />
  </svg>
)

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z" />
  </svg>
)

const IconUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
)

const IconDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

const IconDownload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
)

const IconDots = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
)

const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

function ActionMenu({ actions }: { actions: { label: string, onClick: () => void, icon?: React.ReactNode, variant?: 'danger' | 'default' }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-500 dark:text-stone-400">
        <IconDots />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-stone-200 dark:border-stone-700 z-20 overflow-hidden py-1">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${action.variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-stone-700 dark:text-stone-200'}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type Group = {
  id: number
  name: string
  order: number
  items?: Item[]
}

type Item = {
  id: number
  name: string
  description?: string
  parentItemId?: number | null
  depreciationAmount?: number | null
  order: number
  valuations?: any[]
}

export function SettingsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [catForm, setCatForm] = useState<any>({ name: '', type: 'Expense' })
  const [showCatModal, setShowCatModal] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupForm, setGroupForm] = useState<any>({ name: '' })
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [itemForm, setItemForm] = useState<Record<number, { name: string; description?: string }>>({})
  const [showItemModalForGroup, setShowItemModalForGroup] = useState<number | null>(null)
  const [depreciationValues, setDepreciationValues] = useState<Record<number, string>>({})
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({})
  const [accountMap, setAccountMap] = useState<Record<number, any>>({})
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [automationToken, setAutomationToken] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [showImportInfo, setShowImportInfo] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (groups.length > 0 && activeGroupId === null) {
      setActiveGroupId(groups[0].id)
    }
  }, [groups, activeGroupId])

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await api.transactions.importCsv(f)
      e.target.value = ''
      alert('Transactions imported successfully!')
      refresh()
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed. Please check the file format.')
    }
  }

  function tokenHeader(): Record<string, string> {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function refresh() {
    const [p, c, g, r, accounts, tokenData] = await Promise.all([
      api.settings.profile(),
      api.categories.list(),
      fetch('/api/asset-groups', { headers: tokenHeader() }).then(r => r.json()),
      api.recurringTransactions.list(),
      api.accounts.list(),
      api.settings.getAutomationToken()
    ])
    setProfile(p)
    setEmail((p as any)?.email || '')
    setCategories(c as any[])
    setGroups(g as Group[])
    setRecurringTransactions(r)
    setAutomationToken(tokenData.token)

    // Create maps for easier lookups
    const catMap: Record<number, any> = {}
    c.forEach((cat: any) => catMap[cat.id] = cat)
    setCategoryMap(catMap)

    const accMap: Record<number, any> = {}
    accounts.forEach((acc: any) => accMap[acc.id] = acc)
    setAccountMap(accMap)
  }

  useEffect(() => { refresh() }, [])

  // Move group up/down
  async function moveGroup(index: number, direction: 'up' | 'down') {
    const newGroups = [...groups]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newGroups.length) return

    [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]]
    setGroups(newGroups)

    await fetch('/api/asset-groups/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ groupIds: newGroups.map(g => g.id) })
    })
  }

  // Move item up/down within its group
  async function moveItem(groupId: number, itemIndex: number, direction: 'up' | 'down') {
    const group = groups.find(g => g.id === groupId)
    if (!group || !group.items) return

    const items = group.items.filter(it => !it.parentItemId)
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1
    if (targetIndex < 0 || targetIndex >= items.length) return

    [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]]

    const newGroups = groups.map(g => {
      if (g.id === groupId) {
        const children = (g.items || []).filter(it => it.parentItemId)
        return { ...g, items: [...items, ...children] }
      }
      return g
    })
    setGroups(newGroups)

    await fetch('/api/asset-items/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
      body: JSON.stringify({ itemIds: items.map(it => it.id) })
    })
  }

  // Export functions
  async function exportTransactions() {
    try {
      const response = await fetch('/api/settings/export/transactions', {
        headers: tokenHeader()
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-transactions-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  async function exportAssets() {
    try {
      const response = await fetch('/api/settings/export/assets', {
        headers: tokenHeader()
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fintrack-assets-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  return (
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
        {/* Profile Section */}
        <section className="bg-white dark:bg-stone-800 p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
          <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Profile
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              className="border p-2.5 rounded-md flex-1 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (optional)"
              className="border p-2.5 rounded-md flex-1 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={async () => {
                await api.settings.updateProfile({ email, password: password || undefined })
                setPassword('')
                refresh()
              }}
              className="btn-primary whitespace-nowrap"
            >
              Save Changes
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to sign out?')) {
                  localStorage.removeItem('token')
                  navigate('/login')
                }
              }}
              className="btn-danger whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* Import/Export Data Section */}
        <section className="bg-white dark:bg-stone-800 p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
          <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Data Management
          </h2>
          <div className="space-y-6">

            {/* Import Section */}
            <div>
              <h3 className="text-md font-medium text-stone-900 dark:text-stone-100 mb-2">Import Data</h3>
              <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Import Transactions</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Import transactions from a CSV file. Supported formats: Date, Amount, Category, Notes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportInfo(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <IconUpload />
                  Import CSV
                </button>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileSelected} className="hidden" />
              </div>
            </div>

            <div className="border-t border-stone-200 dark:border-stone-700"></div>

            {/* Export Section */}
            <div>
              <h3 className="text-md font-medium text-stone-900 dark:text-stone-100 mb-2">Export Data</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                Download your financial data in JSON format for backup or analysis purposes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Transactions</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        All transaction records with account and category details
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={exportTransactions}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <IconDownload />
                    Export Transactions
                  </button>
                </div>

                <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:border-stone-500 dark:hover:border-stone-400 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Assets</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Asset groups, items, valuations, formulas, and notes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={exportAssets}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <IconDownload />
                    Export Assets
                  </button>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Exported files contain your complete data including hidden items and historical valuations.
                  Store them securely and use them for backup or data migration purposes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Automation & Integration Section */}
        <section className="bg-white dark:bg-stone-800 p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
          <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Automation & Integration
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Generate a personal API token for iPhone Shortcuts, external apps, or automation tools.
            </p>

            {automationToken ? (
              <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Your Automation Token</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                      Use this token with the Authorization header: <code className="bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 rounded text-xs">Bearer YOUR_TOKEN</code>
                    </p>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={automationToken}
                        readOnly
                        className="w-full p-2.5 pr-24 rounded-md bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-600 font-mono text-xs"
                      />
                      <div className="absolute right-2 top-1/2 -transtone-y-1/2 flex gap-2">
                        <button
                          onClick={() => setShowToken(!showToken)}
                          className="px-2 py-1 text-xs rounded bg-stone-200 dark:bg-stone-600 hover:bg-stone-300 dark:hover:bg-stone-500 transition-colors"
                        >
                          {showToken ? '🙈' : '👁️'}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(automationToken)
                            alert('Token copied to clipboard!')
                          }}
                          className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to generate a new token? The old token will stop working.')) {
                      const { token } = await api.settings.generateAutomationToken()
                      setAutomationToken(token)
                      setShowToken(true)
                    }
                  }}
                  className="btn-danger-solid w-full"
                >
                  Regenerate Token
                </button>
              </div>
            ) : (
              <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 space-y-3">
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  You don't have an automation token yet. Generate one to start using the API with external tools.
                </p>
                <button
                  onClick={async () => {
                    const { token } = await api.settings.generateAutomationToken()
                    setAutomationToken(token)
                    setShowToken(true)
                  }}
                  className="btn-primary w-full"
                >
                  Generate Token
                </button>
              </div>
            )}

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Security Warning:</strong> Treat this token like a password. Anyone with this token can access your FinTrack data.
                Don't share it publicly and regenerate it if compromised.
              </p>
            </div>
          </div>
        </section>

        {/* Recurring Transactions Section */}
        <section className="bg-white dark:bg-stone-800 p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
          <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Recurring Transactions
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            Manage your recurring transactions. These will be automatically created on their scheduled dates.
          </p>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-8 text-stone-500 dark:text-stone-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <p className="text-sm">No recurring transactions yet</p>
              <p className="text-xs mt-1">Add a new transaction and check "Make this a recurring transaction"</p>
            </div>
          ) : (
            <div className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-auto hide-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-stone-900 text-white border-b border-stone-800">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Name & Category</th>
                      <th className="p-3 font-semibold">Amount</th>
                      <th className="p-3 font-semibold">Frequency</th>
                      <th className="p-3 font-semibold">Start Date</th>
                      <th className="p-3 font-semibold">Next Payment</th>
                      <th className="p-3 font-semibold">End Date</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                    {recurringTransactions.map(rt => {
                      const category = categoryMap[rt.categoryId] || rt.category
                      const account = accountMap[rt.accountId] || rt.account
                      const isIncome = category?.type === 'Income'

                      return (
                        <tr key={rt.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="font-semibold text-stone-900 dark:text-stone-100">
                                {rt.notes || 'Recurring Transaction'}
                              </div>
                              <select
                                value={rt.categoryId}
                                onChange={async (e) => {
                                  const newCategoryId = parseInt(e.target.value)
                                  try {
                                    await api.recurringTransactions.update(rt.id, { categoryId: newCategoryId })
                                    refresh()
                                  } catch (err) {
                                    console.error('Error updating category:', err)
                                    alert('Failed to update category')
                                  }
                                }}
                                className={`text-sm font-medium border-none bg-transparent cursor-pointer hover:underline ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                              >
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id} className="text-stone-900">
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className={`p-3 font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            €{Number(rt.amount).toFixed(2)}
                          </td>
                          <td className="p-3 text-stone-900 dark:text-stone-100">
                            <span className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                              {rt.frequency === 'WEEKLY' && '📅 Weekly'}
                              {rt.frequency === 'BIWEEKLY' && '📅 Every 2 weeks'}
                              {rt.frequency === 'MONTHLY' && '📅 Monthly'}
                              {rt.frequency === 'BIMONTHLY' && '📅 Every 2 months'}
                              {rt.frequency === 'QUARTERLY' && '📅 Quarterly'}
                              {rt.frequency === 'YEARLY' && '📅 Yearly'}
                            </span>
                          </td>
                          <td className="p-3 text-stone-900 dark:text-stone-100">
                            <div className="text-sm font-medium">
                              {new Date(rt.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="p-3 text-stone-900 dark:text-stone-100">
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {new Date(rt.nextDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="p-3 text-stone-900 dark:text-stone-100">
                            {rt.endDate ? (
                              <div className="text-sm">
                                {new Date(rt.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            ) : (
                              <div className="text-xs text-stone-500 dark:text-stone-400 italic">No end date</div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${rt.isActive
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                              }`}>
                              {rt.isActive ? '✓ Active' : '⏸ Paused'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    await api.recurringTransactions.update(rt.id, { isActive: !rt.isActive })
                                    refresh()
                                  } catch (err) {
                                    console.error('Error toggling recurring transaction:', err)
                                  }
                                }}
                                className={`p-2 rounded-md text-sm font-medium transition-colors ${rt.isActive
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                                  : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                                  }`}
                                aria-label={rt.isActive ? 'Pause recurring transaction' : 'Resume recurring transaction'}
                                title={rt.isActive ? 'Pause' : 'Resume'}
                              >
                                {rt.isActive ? '⏸' : '▶'}
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (confirm('Are you sure you want to delete this recurring transaction?')) {
                                    try {
                                      await api.recurringTransactions.remove(rt.id)
                                      refresh()
                                    } catch (err) {
                                      console.error('Error deleting recurring transaction:', err)
                                    }
                                  }
                                }}
                                className="p-1.5 rounded-md bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                aria-label="Delete recurring transaction"
                                title="Delete"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Categories Section */}
        <section className="bg-white dark:bg-stone-800 p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              Transaction Categories
            </h2>
            <button
              onClick={() => setShowCatModal(true)}
              className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm"
              aria-label="Add category"
            >
              <IconPlus />
              Add Category
            </button>
          </div>

          <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-800">
            <div className="max-h-[600px] overflow-y-auto hide-scrollbar">
              {['Expense', 'Income', 'Transfer'].map(type => {
                const groupCats = categories
                  .filter(c => c.type === type)
                  .sort((a, b) => a.name.localeCompare(b.name))

                if (groupCats.length === 0) return null

                return (
                  <div key={type}>
                    <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900/50 border-b border-stone-100 dark:border-stone-700/50 sticky top-0 z-10 backdrop-blur-sm">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        {type}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
                      {groupCats.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group">
                          <div className="flex-1 min-w-0 mr-2">
                            {editingCategoryId === c.id ? (
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                onBlur={async () => {
                                  if (editingCategoryName.trim()) {
                                    await api.categories.update(c.id, { name: editingCategoryName, type: c.type })
                                    refresh()
                                  }
                                  setEditingCategoryId(null)
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    if (editingCategoryName.trim()) {
                                      await api.categories.update(c.id, { name: editingCategoryName, type: c.type })
                                      refresh()
                                    }
                                    setEditingCategoryId(null)
                                  } else if (e.key === 'Escape') {
                                    setEditingCategoryId(null)
                                  }
                                }}
                                autoFocus
                                className="w-full px-2 py-1 border border-blue-500 rounded-md text-sm bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingCategoryId(c.id)
                                  setEditingCategoryName(c.name)
                                }}
                                className="cursor-pointer font-medium text-stone-700 dark:text-stone-200 truncate text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Click to edit"
                              >
                                {c.name}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <ActionMenu actions={[
                              {
                                label: 'Edit Name',
                                icon: <IconEdit />,
                                onClick: () => {
                                  setEditingCategoryId(c.id)
                                  setEditingCategoryName(c.name)
                                }
                              },
                              {
                                label: 'Delete',
                                icon: <IconTrash />,
                                variant: 'danger',
                                onClick: async () => {
                                  const ok = confirm(`Delete category "${c.name}"?`)
                                  if (!ok) return
                                  const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE', headers: tokenHeader() })
                                  if (res.status === 409) {
                                    alert('Category in use by transactions')
                                    return
                                  }
                                  refresh()
                                }
                              }
                            ]} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Asset Groups Section */}
        <section className="bg-white dark:bg-stone-800 p-4 sm:p-6 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              Asset Groups & Items
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar border-b border-stone-100 dark:border-stone-700">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGroupId(g.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeGroupId === g.id
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600'
                  }`}
              >
                {g.name}
              </button>
            ))}
            <button
              onClick={() => setShowGroupModal(true)}
              className="px-3 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1"
            >
              <IconPlus /> New Group
            </button>
          </div>

          {/* Active Group Content */}
          {activeGroupId && groups.find(g => g.id === activeGroupId) ? (
            (() => {
              const g = groups.find(g => g.id === activeGroupId)!
              const gIdx = groups.findIndex(grp => grp.id === g.id)

              return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-stone-500 dark:text-stone-400">
                      Manage items for <span className="font-semibold text-stone-900 dark:text-stone-100">{g.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <ActionMenu actions={[
                        {
                          label: 'Move Group Left',
                          icon: <IconUp />,
                          onClick: () => moveGroup(gIdx, 'up')
                        },
                        {
                          label: 'Move Group Right',
                          icon: <IconDown />,
                          onClick: () => moveGroup(gIdx, 'down')
                        },
                        {
                          label: 'Delete Group',
                          icon: <IconTrash />,
                          variant: 'danger',
                          onClick: async () => {
                            const ok = confirm(`Delete group "${g.name}" and all its items?`)
                            if (!ok) return
                            await fetch(`/api/asset-groups/${g.id}`, { method: 'DELETE', headers: tokenHeader() })
                            setActiveGroupId(null)
                            refresh()
                          }
                        }
                      ]} />
                      <button
                        onClick={() => setShowItemModalForGroup(g.id)}
                        className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm"
                      >
                        <IconPlus /> Add Item
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(g.items || []).filter((it: Item) => !it.parentItemId).map((it: Item, itIdx: number) => {
                      const children = (g.items || []).filter((ch: Item) => ch.parentItemId === it.id)

                      return (
                        <div key={it.id} className="bg-stone-50 dark:bg-stone-900/30 border border-stone-200 dark:border-stone-700 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-stone-900 dark:text-stone-100">{it.name}</h4>
                              {it.description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{it.description}</p>}
                            </div>
                            <ActionMenu actions={[
                              {
                                label: 'Add Child Item',
                                icon: <IconPlus />,
                                onClick: () => {
                                  const name = prompt('Child item name?')
                                  if (name) {
                                    fetch(`/api/asset-items/${it.id}/children`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                                      body: JSON.stringify({ name })
                                    }).then(() => refresh())
                                  }
                                }
                              },
                              {
                                label: 'Move Up',
                                icon: <IconUp />,
                                onClick: () => moveItem(g.id, itIdx, 'up')
                              },
                              {
                                label: 'Move Down',
                                icon: <IconDown />,
                                onClick: () => moveItem(g.id, itIdx, 'down')
                              },
                              {
                                label: 'Delete Item',
                                icon: <IconTrash />,
                                variant: 'danger',
                                onClick: async () => {
                                  const ok = confirm(`Delete item "${it.name}"?`)
                                  if (!ok) return
                                  await fetch(`/api/asset-items/${it.id}`, { method: 'DELETE', headers: tokenHeader() })
                                  refresh()
                                }
                              }
                            ]} />
                          </div>

                          {/* Depreciation Input */}
                          {children.length === 0 && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                              <span>Depr:</span>
                              <div className="flex items-center">
                                <span>€</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={depreciationValues[it.id] !== undefined ? depreciationValues[it.id] : (it.depreciationAmount || '')}
                                  onChange={(e) => setDepreciationValues(prev => ({ ...prev, [it.id]: e.target.value }))}
                                  onBlur={async () => {
                                    const value = depreciationValues[it.id] ? Number(depreciationValues[it.id]) : null
                                    await fetch(`/api/asset-items/${it.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                                      body: JSON.stringify({ depreciationAmount: value })
                                    })
                                    await refresh()
                                  }}
                                  className="w-16 bg-transparent border-none p-0 text-xs focus:ring-0 text-stone-500 dark:text-stone-400 font-medium text-right"
                                />
                              </div>
                            </div>
                          )}

                          {/* Children List */}
                          {children.length > 0 && (
                            <div className="mt-1 space-y-2">
                              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Sub-items</div>
                              {children.map(ch => (
                                <div key={ch.id} className="flex items-center justify-between bg-white dark:bg-stone-800 p-2 rounded border border-stone-100 dark:border-stone-700/50">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-stone-700 dark:text-stone-300 truncate">{ch.name}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity">
                                      <span className="text-stone-300 text-[10px]">€</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0"
                                        value={depreciationValues[ch.id] !== undefined ? depreciationValues[ch.id] : (ch.depreciationAmount || '')}
                                        onChange={(e) => setDepreciationValues(prev => ({ ...prev, [ch.id]: e.target.value }))}
                                        onBlur={async () => {
                                          const value = depreciationValues[ch.id] ? Number(depreciationValues[ch.id]) : null
                                          await fetch(`/api/asset-items/${ch.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                                            body: JSON.stringify({ depreciationAmount: value })
                                          })
                                          await refresh()
                                        }}
                                        className="w-12 text-right text-xs bg-transparent border-none p-0 focus:ring-0 text-stone-600 dark:text-stone-400"
                                      />
                                    </div>
                                    <button
                                      onClick={async () => {
                                        const ok = confirm(`Delete child item "${ch.name}"?`)
                                        if (!ok) return
                                        await fetch(`/api/asset-items/${ch.id}`, { method: 'DELETE', headers: tokenHeader() })
                                        refresh()
                                      }}
                                      className="text-stone-400 hover:text-red-500 transition-colors"
                                    >
                                      <IconTrash />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Empty State for Group */}
                    {(g.items || []).length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl">
                        <p className="text-stone-500 dark:text-stone-400 mb-2">This group is empty.</p>
                        <button
                          onClick={() => setShowItemModalForGroup(g.id)}
                          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          Add your first item
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="text-center py-12">
              <p className="text-stone-500 dark:text-stone-400">Select a group to view items or create a new one.</p>
            </div>
          )}
        </section>

        {/* CSV Import Info Modal */}
        {showImportInfo && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
              <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-stone-900 dark:text-stone-100">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                CSV Import Format
              </h3>

              <div className="space-y-4">
                <div className="bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-800 rounded-lg p-4">
                  <p className="text-sm text-stone-700 dark:text-stone-300 mb-2">
                    Your CSV file should contain transaction data with the following structure:
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 text-stone-700 dark:text-stone-200">CSV Format:</h4>
                  <div className="bg-stone-50 dark:bg-stone-900/50 rounded p-3 border border-stone-200 dark:border-stone-700">
                    <code className="text-sm bg-white dark:bg-stone-800 px-3 py-2 rounded block font-mono text-stone-800 dark:text-stone-200">
                      date,amount,category,notes
                    </code>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">or using semicolon as delimiter:</p>
                    <code className="text-sm bg-white dark:bg-stone-800 px-3 py-2 rounded block font-mono text-stone-800 dark:text-stone-200 mt-1">
                      date;amount;category;notes
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 text-stone-700 dark:text-stone-200">Field Details:</h4>
                  <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
                    <li className="flex gap-2">
                      <span className="font-mono bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-xs">date</span>
                      <span>Date in DD/MM/YYYY or YYYY-MM-DD format</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-xs">amount</span>
                      <span>Transaction amount (use dot as decimal separator, e.g., 45.50)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-xs">category</span>
                      <span>Category name (will be created if doesn't exist)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-xs">notes</span>
                      <span>Optional transaction notes</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">📌 Notes:</p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 ml-4 list-disc">
                    <li>Both comma (,) and semicolon (;) are supported as column delimiters</li>
                    <li>Use dot (.) as decimal separator for amounts</li>
                    <li>Header row is optional - if missing, default order is assumed</li>
                    <li>Invalid rows will be skipped automatically</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2 text-stone-700 dark:text-stone-200">Example CSV:</h4>
                  <div className="bg-stone-900 dark:bg-stone-950 rounded p-3 overflow-x-auto">
                    <pre className="text-xs text-green-400 font-mono">
                      {`date,amount,category,notes
25/10/2024,45.50,Groceries,Weekly shopping
26/10/2024,120.00,Utilities,Electric bill
27/10/2024,15.99,Entertainment,Netflix`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
                <button
                  onClick={() => setShowImportInfo(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowImportInfo(false)
                    fileInputRef.current?.click()
                  }}
                  className="btn-primary"
                >
                  Select CSV File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showCatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-stone-800 rounded-lg p-6 w-full max-w-md space-y-4 text-stone-900 dark:text-stone-100 shadow-xl">
              <h3 className="text-xl font-semibold">Add Category</h3>
              <input
                value={catForm.name}
                onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="Category name"
                className="w-full border p-2.5 rounded-md bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={catForm.type}
                onChange={e => setCatForm({ ...catForm, type: e.target.value })}
                className="w-full border p-2.5 rounded-md bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500"
              >
                <option>Expense</option>
                <option>Income</option>
                <option>Transfer</option>
              </select>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCatModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!catForm.name) return
                    await api.categories.create(catForm)
                    setCatForm({ name: '', type: 'Expense' })
                    setShowCatModal(false)
                    refresh()
                  }}
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-stone-800 rounded-lg p-6 w-full max-w-md space-y-4 text-stone-900 dark:text-stone-100 shadow-xl">
              <h3 className="text-xl font-semibold">Add Asset Group</h3>
              <input
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Group name (e.g., Stock & ETF)"
                className="w-full border p-2.5 rounded-md bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!groupForm.name) return
                    await fetch('/api/asset-groups', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                      body: JSON.stringify({ name: groupForm.name })
                    })
                    setGroupForm({ name: '' })
                    setShowGroupModal(false)
                    refresh()
                  }}
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showItemModalForGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-stone-800 rounded-lg p-6 w-full max-w-md space-y-4 text-stone-900 dark:text-stone-100 shadow-xl">
              <h3 className="text-xl font-semibold">Add Item</h3>
              <input
                value={itemForm[showItemModalForGroup]?.name || ''}
                onChange={e => setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup] || {}), name: e.target.value } })}
                placeholder="Item name (e.g., Trade Republic)"
                className="w-full border p-2.5 rounded-md bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={itemForm[showItemModalForGroup]?.description || ''}
                onChange={e => setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup] || {}), description: e.target.value } })}
                placeholder="Description (optional)"
                className="w-full border p-2.5 rounded-md bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 border-stone-300 dark:border-stone-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowItemModalForGroup(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const it = itemForm[showItemModalForGroup!]
                    if (!it?.name) return
                    await fetch(`/api/asset-groups/${showItemModalForGroup}/items`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...tokenHeader() },
                      body: JSON.stringify(it)
                    })
                    setItemForm({ ...itemForm, [showItemModalForGroup!]: { name: '', description: '' } })
                    setShowItemModalForGroup(null)
                    refresh()
                  }}
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
