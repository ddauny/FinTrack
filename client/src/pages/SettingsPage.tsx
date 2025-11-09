import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Icons
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/>
  </svg>
)

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/>
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
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [catForm, setCatForm] = useState<any>({ name:'', type:'Expense' })
  const [showCatModal, setShowCatModal] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupForm, setGroupForm] = useState<any>({ name:'' })
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [itemForm, setItemForm] = useState<Record<number, { name: string; description?: string }>>({})
  const [showItemModalForGroup, setShowItemModalForGroup] = useState<number | null>(null)
  const [depreciationValues, setDepreciationValues] = useState<Record<number, string>>({})
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, any>>({})
  const [accountMap, setAccountMap] = useState<Record<number, any>>({})

  function tokenHeader(): Record<string, string> {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function refresh() {
    const [p, c, g, r, accounts] = await Promise.all([
      api.settings.profile(), 
      api.categories.list(), 
      fetch('/api/asset-groups', { headers: tokenHeader() }).then(r=>r.json()),
      api.recurringTransactions.list(),
      api.accounts.list()
    ])
    setProfile(p)
    setEmail((p as any)?.email||'')
    setCategories(c as any[])
    setGroups(g as Group[])
    setRecurringTransactions(r)
    
    // Create maps for easier lookups
    const catMap: Record<number, any> = {}
    c.forEach((cat: any) => catMap[cat.id] = cat)
    setCategoryMap(catMap)
    
    const accMap: Record<number, any> = {}
    accounts.forEach((acc: any) => accMap[acc.id] = acc)
    setAccountMap(accMap)
  }

  useEffect(()=>{ refresh() }, [])

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
    <div className="p-2 sm:p-4 space-y-6 max-w-7xl mx-auto">
      {/* Profile Section */}
      <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Profile
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            placeholder="Email"
            className="border p-2.5 rounded-md flex-1 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          />
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            placeholder="New password (optional)" 
            className="border p-2.5 rounded-md flex-1 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          />
          <button 
            onClick={async()=>{ 
              await api.settings.updateProfile({ email, password: password||undefined })
              setPassword('')
              refresh() 
            }} 
            className="px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap transition-colors"
          >
            Save Changes
          </button>
        </div>
      </section>

      {/* Export Data Section */}
      <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <IconDownload />
          Export Data
        </h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Download your financial data in JSON format for backup or analysis purposes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Transactions</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    All transaction records with account and category details
                  </p>
                </div>
              </div>
              <button
                onClick={exportTransactions}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
              >
                <IconDownload />
                Export Transactions
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Assets</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Asset groups, items, valuations, formulas, and notes
                  </p>
                </div>
              </div>
              <button
                onClick={exportAssets}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
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
      </section>

      {/* Recurring Transactions Section */}
      <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Recurring Transactions
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Manage your recurring transactions. These will be automatically created on their scheduled dates.
        </p>
        {recurringTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <p className="text-sm">No recurring transactions yet</p>
            <p className="text-xs mt-1">Add a new transaction and check "Make this a recurring transaction"</p>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                  <tr className="text-left text-slate-700 dark:text-slate-200">
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
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recurringTransactions.map(rt => {
                    const category = categoryMap[rt.categoryId] || rt.category
                    const account = accountMap[rt.accountId] || rt.account
                    const isIncome = category?.type === 'Income'
                    
                    return (
                      <tr key={rt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {rt.notes || 'Recurring Transaction'}
                            </div>
                            <div className={`text-sm ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {category?.name || 'Unknown Category'}
                            </div>
                            {account && <div className="text-xs text-gray-500 dark:text-gray-400">{account.name}</div>}
                          </div>
                        </td>
                        <td className={`p-3 font-semibold ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          €{Number(rt.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-100">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                            {rt.frequency === 'WEEKLY' && '📅 Weekly'}
                            {rt.frequency === 'BIWEEKLY' && '📅 Every 2 weeks'}
                            {rt.frequency === 'MONTHLY' && '📅 Monthly'}
                            {rt.frequency === 'BIMONTHLY' && '📅 Every 2 months'}
                            {rt.frequency === 'QUARTERLY' && '📅 Quarterly'}
                            {rt.frequency === 'YEARLY' && '📅 Yearly'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-100">
                          <div className="text-sm font-medium">
                            {new Date(rt.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-100">
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {new Date(rt.nextDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-3 text-slate-900 dark:text-slate-100">
                          {rt.endDate ? (
                            <div className="text-sm">
                              {new Date(rt.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">No end date</div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            rt.isActive 
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
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
                              className={`p-2 rounded-md text-sm font-medium transition-colors ${
                                rt.isActive
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
      <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            Transaction Categories
          </h2>
          <button 
            onClick={()=>setShowCatModal(true)} 
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors" 
            aria-label="Add category"
          >
            <IconPlus />
            Add Category
          </button>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                <tr className="text-left text-slate-700 dark:text-slate-200">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map(c=> (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-3 text-slate-900 dark:text-slate-100">{c.name}</td>
                    <td className="p-3">
                      <select 
                        value={c.type} 
                        onChange={async(e)=>{ 
                          await api.categories.update(c.id, { name: c.name, type: e.target.value })
                          refresh() 
                        }} 
                        className="border px-2 py-1 rounded-md text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600"
                      >
                        <option>Expense</option>
                        <option>Income</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={async()=>{ 
                          const ok = confirm(`Delete category "${c.name}"?`)
                          if(!ok) return
                          const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE', headers: tokenHeader() })
                          if(res.status===409){ 
                            alert('Category in use by transactions')
                            return 
                          } 
                          refresh() 
                        }} 
                        className="p-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors" 
                        aria-label="Delete Category"
                        title="Delete"
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Asset Groups Section */}
      <section className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            Asset Groups & Items
          </h2>
          <button 
            onClick={()=>setShowGroupModal(true)} 
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors" 
            aria-label="Add group"
          >
            <IconPlus />
            Add Group
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((g, gIdx)=> (
            <div key={g.id} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={()=>moveGroup(gIdx, 'up')}
                      disabled={gIdx === 0}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <IconUp />
                    </button>
                    <button
                      onClick={()=>moveGroup(gIdx, 'down')}
                      disabled={gIdx === groups.length - 1}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <IconDown />
                    </button>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{g.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={()=>setShowItemModalForGroup(g.id)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors" 
                    aria-label="Add item"
                  >
                    <IconPlus />
                    Add Item
                  </button>
                  <button 
                    onClick={async()=>{ 
                      const ok = confirm(`Delete group "${g.name}" and all its items?`)
                      if(!ok) return
                      await fetch(`/api/asset-groups/${g.id}`, { method:'DELETE', headers: tokenHeader() })
                      refresh() 
                    }} 
                    className="p-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors" 
                    aria-label="Delete group"
                    title="Delete group"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-200">
                      <th className="p-3 font-semibold w-12">Order</th>
                      <th className="p-3 font-semibold">Item Name</th>
                      <th className="p-3 font-semibold">Description</th>
                      <th className="p-3 font-semibold w-32">Depreciation (€/mo)</th>
                      <th className="p-3 text-right font-semibold w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(g.items || []).filter((it:Item)=>!it.parentItemId).map((it:Item, itIdx:number)=>{
                      const children = (g.items || []).filter((ch:Item)=>ch.parentItemId===it.id)
                      const parentItems = (g.items || []).filter((pi:Item)=>!pi.parentItemId)
                      
                      return (
                        <>
                          <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="p-3">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={()=>moveItem(g.id, itIdx, 'up')}
                                  disabled={itIdx === 0}
                                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move up"
                                >
                                  <IconUp />
                                </button>
                                <button
                                  onClick={()=>moveItem(g.id, itIdx, 'down')}
                                  disabled={itIdx === parentItems.length - 1}
                                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move down"
                                >
                                  <IconDown />
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{it.name}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{it.description || '—'}</td>
                            <td className="p-3">
                              {children.length === 0 ? (
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
                                  className="w-24 px-2 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-400 text-sm italic">N/A (has children)</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={()=>{ 
                                    const name=prompt('Child item name?')
                                    if(name){ 
                                      fetch(`/api/asset-items/${it.id}/children`, { 
                                        method:'POST', 
                                        headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
                                        body: JSON.stringify({ name }) 
                                      }).then(()=>refresh()) 
                                    } 
                                  }} 
                                  className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors" 
                                  aria-label="Add child"
                                  title="Add child item"
                                >
                                  <IconPlus />
                                </button>
                                <button 
                                  onClick={async()=>{ 
                                    const ok = confirm(`Delete item "${it.name}"?`)
                                    if(!ok) return
                                    await fetch(`/api/asset-items/${it.id}`, { method:'DELETE', headers: tokenHeader() })
                                    refresh() 
                                  }} 
                                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors" 
                                  aria-label="Delete item"
                                  title="Delete item"
                                >
                                  <IconTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {children.map((ch:Item)=>(
                            <tr key={`child-${ch.id}`} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-3"></td>
                              <td className="p-3 pl-8 text-slate-700 dark:text-slate-300">
                                <span className="text-gray-400 mr-2">↳</span>
                                {ch.name}
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">{ch.description || '—'}</td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
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
                                  className="w-24 px-2 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    onClick={async()=>{ 
                                      const ok = confirm(`Delete child item "${ch.name}"?`)
                                      if(!ok) return
                                      await fetch(`/api/asset-items/${ch.id}`, { method:'DELETE', headers: tokenHeader() })
                                      refresh() 
                                    }} 
                                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors" 
                                    aria-label="Delete item"
                                    title="Delete child item"
                                  >
                                    <IconTrash />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modals */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-slate-100 shadow-xl">
            <h3 className="text-xl font-semibold">Add Category</h3>
            <input 
              value={catForm.name} 
              onChange={e=>setCatForm({...catForm, name:e.target.value})} 
              placeholder="Category name" 
              className="w-full border p-2.5 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" 
            />
            <select 
              value={catForm.type} 
              onChange={e=>setCatForm({...catForm, type:e.target.value})} 
              className="w-full border p-2.5 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            >
              <option>Expense</option>
              <option>Income</option>
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={()=>setShowCatModal(false)} 
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async()=>{ 
                  if(!catForm.name) return
                  await api.categories.create(catForm)
                  setCatForm({ name:'', type:'Expense' })
                  setShowCatModal(false)
                  refresh() 
                }} 
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-slate-100 shadow-xl">
            <h3 className="text-xl font-semibold">Add Asset Group</h3>
            <input 
              value={groupForm.name} 
              onChange={e=>setGroupForm({...groupForm, name:e.target.value})} 
              placeholder="Group name (e.g., Stock & ETF)" 
              className="w-full border p-2.5 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" 
            />
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={()=>setShowGroupModal(false)} 
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async()=>{ 
                  if(!groupForm.name) return
                  await fetch('/api/asset-groups', { 
                    method:'POST', 
                    headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
                    body: JSON.stringify({ name: groupForm.name }) 
                  })
                  setGroupForm({ name:'' })
                  setShowGroupModal(false)
                  refresh() 
                }} 
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showItemModalForGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-slate-100 shadow-xl">
            <h3 className="text-xl font-semibold">Add Item</h3>
            <input 
              value={itemForm[showItemModalForGroup]?.name||''} 
              onChange={e=>setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup]||{}), name:e.target.value } })} 
              placeholder="Item name (e.g., Trade Republic)" 
              className="w-full border p-2.5 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" 
            />
            <input 
              value={itemForm[showItemModalForGroup]?.description||''} 
              onChange={e=>setItemForm({ ...itemForm, [showItemModalForGroup]: { ...(itemForm[showItemModalForGroup]||{}), description:e.target.value } })} 
              placeholder="Description (optional)" 
              className="w-full border p-2.5 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" 
            />
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={()=>setShowItemModalForGroup(null)} 
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async()=>{ 
                  const it=itemForm[showItemModalForGroup!]
                  if(!it?.name) return
                  await fetch(`/api/asset-groups/${showItemModalForGroup}/items`, { 
                    method:'POST', 
                    headers:{ 'Content-Type':'application/json', ...tokenHeader() }, 
                    body: JSON.stringify(it) 
                  })
                  setItemForm({ ...itemForm, [showItemModalForGroup!]: { name:'', description:'' } })
                  setShowItemModalForGroup(null)
                  refresh() 
                }} 
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
