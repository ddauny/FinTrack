// client/src/pages/SubscriptionsPage.tsx
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Account, Category } from '../types'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { monthlyEquivalent, FREQUENCY_LABELS } from '../lib/subscriptions'

interface RecurringExpense {
  id: number
  accountId: number
  categoryId: number
  amount: number | string
  type: string
  notes: string | null
  frequency: string
  nextDate: string
  isActive: boolean
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center h-64 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <div className="text-stone-600 dark:text-stone-300 text-sm">Loading subscriptions...</div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-stone-800 p-12 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 text-center flex flex-col justify-center items-center">
      <div className="text-4xl mb-3">📅</div>
      <div className="text-stone-500 dark:text-stone-400 text-sm">{message}</div>
    </div>
  )
}

export function SubscriptionsPage() {
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, Category>>({})
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({})
  const [loading, setLoading] = useState(true)
  const [showPaused, setShowPaused] = useState(false)

  const isFirstLoad = useRef(true)

  const load = () => {
    if (isFirstLoad.current) setLoading(true)
    Promise.all([
      api.recurringTransactions.list(),
      api.categories.list(),
      api.accounts.list(),
    ]).then(([recurring, categories, accounts]) => {
      setItems((recurring as RecurringExpense[]).filter(r => r.type === 'Expense'))
      setCategoryMap(Object.fromEntries((categories as Category[]).map(c => [c.id, c])))
      setAccountMap(Object.fromEntries((accounts as Account[]).map(a => [a.id, a])))
    }).catch(console.error).finally(() => {
      isFirstLoad.current = false
      setLoading(false)
    })
  }
  useEffect(load, [])

  const handlePause = async (id: number) => {
    try {
      await api.recurringTransactions.update(id, { isActive: false })
    } catch (e) {
      console.error(e)
      alert('Failed to pause subscription')
      return
    }
    load()
  }
  const handleReactivate = async (id: number) => {
    try {
      await api.recurringTransactions.update(id, { isActive: true })
    } catch (e) {
      console.error(e)
      alert('Failed to reactivate subscription')
      return
    }
    load()
  }
  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subscription? This cannot be undone.')) return
    try {
      await api.recurringTransactions.remove(id)
    } catch (e) {
      console.error(e)
      alert('Failed to delete subscription')
      return
    }
    load()
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto hide-scrollbar">
        <div className="p-3 max-w-7xl mx-auto"><LoadingSpinner /></div>
      </div>
    )
  }

  const active = [...items]
    .filter(r => r.isActive)
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())
  const paused = items.filter(r => !r.isActive)

  const totalMonthly = active.reduce((sum, r) => sum + monthlyEquivalent(Number(r.amount), r.frequency), 0)

  const labelFor = (r: RecurringExpense) => r.notes || categoryMap[r.categoryId]?.name || `Subscription #${r.id}`

  return (
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div className="p-3 space-y-3 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Subscriptions</h1>

        <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
          <div className="text-sm text-stone-500 dark:text-stone-400">Total monthly equivalent</div>
          <div className="text-2xl font-bold text-stone-900 dark:text-white">
            <PrivacyNumber value={totalMonthly}>{formatEUR(totalMonthly)}</PrivacyNumber>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Active ({active.length})</h2>
          {active.length === 0 && paused.length === 0 ? (
            <EmptyState message="No active subscriptions. Create a recurring expense from the Transactions page to see it here." />
          ) : active.length === 0 ? (
            <EmptyState message="No active subscriptions. Reactivate one below." />
          ) : (
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
              {active.map(r => (
                <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-white">{labelFor(r)}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {categoryMap[r.categoryId]?.name || 'Uncategorized'} · {accountMap[r.accountId]?.name || 'Unknown account'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-stone-900 dark:text-white">
                      <PrivacyNumber value={Number(r.amount)}>{formatEUR(r.amount)}</PrivacyNumber>
                      {' '}<span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ {FREQUENCY_LABELS[r.frequency] || r.frequency}</span>
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">Next: {formatDateDMY(r.nextDate)}</div>
                  </div>
                  <div className="text-right text-sm text-stone-500 dark:text-stone-400 min-w-[90px]">
                    <PrivacyNumber value={monthlyEquivalent(Number(r.amount), r.frequency)}>
                      {formatEUR(monthlyEquivalent(Number(r.amount), r.frequency))}
                    </PrivacyNumber>
                    <div className="text-xs">/mo equiv.</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handlePause(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">Pause</button>
                    <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {paused.length > 0 && (
          <div className="space-y-2">
            <button onClick={() => setShowPaused(s => !s)} className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <span className={`transition-transform ${showPaused ? 'rotate-90' : ''}`}>▸</span>
              Paused ({paused.length})
            </button>
            {showPaused && (
              <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
                {paused.map(r => (
                  <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3 opacity-70">
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white">{labelFor(r)}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        {categoryMap[r.categoryId]?.name || 'Uncategorized'} · {accountMap[r.accountId]?.name || 'Unknown account'}
                      </div>
                    </div>
                    <div className="text-right font-semibold text-stone-900 dark:text-white">
                      <PrivacyNumber value={Number(r.amount)}>{formatEUR(r.amount)}</PrivacyNumber>
                      {' '}<span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ {FREQUENCY_LABELS[r.frequency] || r.frequency}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleReactivate(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">Reactivate</button>
                      <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
