import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { Tag } from '../types'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'

// Mobile Transaction Card Component  
function MobileTransactionCard({
  transaction,
  selectionMode,
  selectedIds,
  toggleSelectItem,
  categoryMap,
  setEditingId,
  setForm,
  setCategoryQuery,
  setShowModal,
  setItems,
  setTotal,
  setFormTagIds
}: any) {
  const [showMenu, setShowMenu] = useState(false);
  const t = transaction;

  return (
    <div className="bg-white dark:bg-stone-800 p-4 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          {selectionMode && (
            <input
              type="checkbox"
              checked={selectedIds.has(t.id)}
              onChange={() => toggleSelectItem(t.id)}
              className="mt-1 w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-medium text-stone-500 dark:text-stone-400">{formatDateDMY(t.date)}</div>
              <div className={`text-lg font-bold ${((t as any).type === 'Income' || categoryMap[t.categoryId]?.type === 'Income' || t.category?.type === 'Income') ? 'text-green-600 dark:text-green-400' :
                ((t as any).type === 'Transfer' || categoryMap[t.categoryId]?.type === 'Transfer' || t.category?.type === 'Transfer') ? 'text-blue-600 dark:text-blue-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                <PrivacyNumber value={t.amount}>
                  {formatEUR(t.amount)}
                </PrivacyNumber>
              </div>
            </div>
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">{t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}</div>
            {t.notes && <div className="text-sm text-stone-600 dark:text-stone-400 mt-2 italic">{t.notes}</div>}
            {(t as any).recurringTransactionId && (
              <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                ⟳ Recurring
              </div>
            )}
            {t.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {t.tags.map((tag: any) => (
                  <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Menu 3 puntini */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5 text-stone-600 dark:text-stone-400" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 w-40 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setEditingId(t.id);
                    const category = categoryMap[t.categoryId] || t.category;
                    setForm({
                      date: String(t.date).slice(0, 10),
                      amount: t.amount,
                      accountId: t.accountId,
                      categoryId: t.categoryId,
                      notes: t.notes || '',
                      isRecurring: false,
                      frequency: 'MONTHLY',
                      endDate: ''
                    });
                    setCategoryQuery(category?.name || '');
                    setFormTagIds(t.tags?.map((tg: any) => tg.id) || []);
                    setShowModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z" />
                    <path d="M5.25 19.5h13.5" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={async () => {
                    setShowMenu(false);
                    if (!confirm('Delete this transaction?')) return;
                    try {
                      await api.transactions.remove(t.id);
                      setItems((prev: any[]) => prev.filter(x => x.id !== t.id));
                      setTotal((prev: number) => Math.max(0, prev - 1));
                    } catch { /* ignore */ }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-stone-100 dark:border-stone-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function TransactionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialAutoRefreshSkipped = useRef(false)
  const initialLoadDone = useRef(false)
  const initialFetchStarted = useRef(false)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0, 10), amount: 0, accountId: '', categoryId: '', notes: '', isRecurring: false, frequency: 'MONTHLY', endDate: '' })
  const [categoryQuery, setCategoryQuery] = useState('')
  const [notesSuggestions, setNotesSuggestions] = useState<string[]>([])
  const [showNotesSuggestions, setShowNotesSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [categorySuggestions, setCategorySuggestions] = useState<any[]>([])
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1)
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'type' | 'accountId' | 'categoryId' | 'notes'>('date')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [txnType, setTxnType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagFilter, setSelectedTagFilter] = useState('')
  const [formTagIds, setFormTagIds] = useState<number[]>([])
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [showNewTagInput, setShowNewTagInput] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  const TAG_COLORS = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b']
  const pageSize = 20

  async function fetchPage(p: number, mode: 'replace' | 'append' = 'replace') {
    if (loading) return
    setLoading(true)
    let query = `?page=${p}&limit=${pageSize}&sortBy=${sortBy}&order=${order}`

    // If initial navigation provided URL params and initial load hasn't
    // completed yet, prefer URL params to build the query so any concurrent
    // fetches use the intended filters.
    if (!initialLoadDone.current) {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlStartDate = urlParams.get('startDate')
        const urlEndDate = urlParams.get('endDate')
        const urlCategory = urlParams.get('category')
        const urlType = urlParams.get('type')
        if (urlStartDate) query += `&startDate=${urlStartDate}`
        if (urlEndDate) query += `&endDate=${urlEndDate}`
        if (urlCategory) query += `&category=${encodeURIComponent(urlCategory)}`
        if (urlType) query += `&type=${encodeURIComponent(urlType)}`
      } catch (err) {
        // ignore and fall back to state
      }
    }

    // Fallback / normal behavior: include current state filters if provided
    if (startDate && !query.includes('&startDate=')) query += `&startDate=${startDate}`
    if (endDate && !query.includes('&endDate=')) query += `&endDate=${endDate}`
    if (selectedCategory && !query.includes('&category=')) {
      query += `&category=${encodeURIComponent(selectedCategory)}`
    }
    if (txnType && !query.includes('&type=')) {
      query += `&type=${encodeURIComponent(txnType)}`
    }
    if (searchQuery.trim() && !query.includes('&search=')) {
      query += `&search=${encodeURIComponent(searchQuery.trim())}`
    }
    if (selectedTagFilter) {
      query += `&filterByTag=${selectedTagFilter}`
    }

    const res: any = await api.transactions.list(query)
    // Defensive client-side filter: if txnType (or type in URL) is set, ensure we only
    // display transactions matching that type. This guards against server-side misses.
    let receivedItems = res.items || []
    const urlParams = new URLSearchParams(window.location.search)
    const urlType = urlParams.get('type')
    const effectiveType = txnType || urlType || ''
    if (effectiveType) {
      const beforeCount = receivedItems.length
      receivedItems = receivedItems.filter((it: any) => {
        if (!it) return false
        if (it.type) return it.type === effectiveType
        if (it.category && it.category.type) return it.category.type === effectiveType
        return false
      })
    }
    setTotal(res.total || 0)
    if (mode === 'replace') {
      setItems(receivedItems)
    } else {
      // Prevent duplicates by checking if item already exists
      setItems(prev => {
        const existingIds = new Set(prev.map((item: any) => item.id))
        const newItems = (receivedItems || []).filter((item: any) => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })
    }
    setPage(p)
    setLoading(false)
  }
  function refresh() { fetchPage(1, 'replace') }

  // Handle URL parameters for date and category filtering - MUST be first
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStartDate = urlParams.get('startDate');
    const urlEndDate = urlParams.get('endDate');
    const urlCategory = urlParams.get('category');
    const urlType = urlParams.get('type');



    if (urlStartDate && urlEndDate) {
      setStartDate(urlStartDate);
      setEndDate(urlEndDate);
    }
    if (urlCategory) {
      setSelectedCategory(urlCategory);
    }
    if (urlType) {
      setTxnType(urlType)
    }
  }, []);

  // Immediately fetch using URL params (avoid race with state updates)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStartDate = urlParams.get('startDate');
    const urlEndDate = urlParams.get('endDate');
    const urlCategory = urlParams.get('category');
    const urlType = urlParams.get('type');

    const doFetch = async () => {
      // Prevent double-starting the initial fetch (React StrictMode/dev may mount effects twice)
      if (initialFetchStarted.current) return
      initialFetchStarted.current = true
      // Mark we don't want the auto-refresh effect to run while initial fetch is in-flight
      initialAutoRefreshSkipped.current = true
      try {
        setLoading(true)
        // Reflect URL params into component state so later updates use the same filters
        if (urlStartDate) setStartDate(urlStartDate)
        if (urlEndDate) setEndDate(urlEndDate)
        if (urlCategory) setSelectedCategory(urlCategory)
        if (urlType) setTxnType(urlType)

        let query = `?page=1&limit=${pageSize}&sortBy=${sortBy}&order=${order}`
        if (urlStartDate) query += `&startDate=${urlStartDate}`
        if (urlEndDate) query += `&endDate=${urlEndDate}`
        if (urlCategory) query += `&category=${encodeURIComponent(urlCategory)}`
        if (urlType) query += `&type=${encodeURIComponent(urlType)}`
        if (searchQuery.trim()) query += `&search=${encodeURIComponent(searchQuery.trim())}`

        const res: any = await api.transactions.list(query)
        // Apply the same defensive filtering we use in fetchPage so initial
        // URL-driven responses are consistent (avoid showing incomes when
        // type=Expense is requested).
        let receivedItems = res.items || []
        const urlTypeLocal = urlType
        const effectiveTypeLocal = urlTypeLocal || ''
        if (effectiveTypeLocal) {
          const beforeCount = receivedItems.length
          receivedItems = receivedItems.filter((it: any) => {
            if (!it) return false
            if (it.type) return it.type === effectiveTypeLocal
            if (it.category && it.category.type) return it.category.type === effectiveTypeLocal
            return false
          })

        }
        setItems(receivedItems)
        setTotal(res.total || 0)
        setPage(1)
        // Mark initial load done so subsequent fetches use component state
        initialLoadDone.current = true
      } catch (err) {
        console.error('Error fetching transactions from URL params:', err)
      } finally {
        setLoading(false)
      }
    }

    // Only run this once on mount to handle navigation from other pages
    doFetch()
  }, [])

  useEffect(() => {
    Promise.all([api.accounts.list(), api.categories.list(), api.tags.list()]).then(([accs, cats, tags]) => {
      setCategories(cats as any[])
      setAllTags(tags)
      if (!form.accountId && (accs as any[])[0]) setForm((f: any) => ({ ...f, accountId: (accs as any[])[0].id }))
      if (!form.categoryId && (cats as any[])[0]) setForm((f: any) => ({ ...f, categoryId: (cats as any[])[0].id }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // re-fetch on sort change or filter change
  useEffect(() => {
    // If the initial URL-driven fetch hasn't completed yet, don't trigger
    // automatic refreshes — they would race and may overwrite the URL-driven results.
    if (!initialLoadDone.current) {
      return
    }

    setPage(1); // Reset to first page when filters change
    setItems([]); // Clear existing items to prevent duplicates
    // Force refresh with new parameters
    setTimeout(() => refresh(), 50); // Small delay to ensure state is updated
  }, [sortBy, order, startDate, endDate, selectedCategory, searchQuery, txnType, selectedTagFilter])

  // infinite scroll on scrollable container
  useEffect(() => {
    function onScroll() {
      const container = scrollContainerRef.current

      // Mobile: window scroll
      if (window.innerWidth < 640) {
        const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500
        const hasMore = items.length < total
        if (nearBottom && hasMore && !loading) fetchPage(page + 1, 'append')
        return
      }

      // Desktop: container scroll
      if (!container) return
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
      const hasMore = items.length < total
      // Only trigger infinite scroll if we're not changing sort/filters
      if (nearBottom && hasMore && !loading) fetchPage(page + 1, 'append')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true })
    }
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (container) container.removeEventListener('scroll', onScroll)
    }
  }, [items.length, total, loading, page])

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle Scroll To Top visibility (throttled with rAF)
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const containerScroll = scrollContainerRef.current ? scrollContainerRef.current.scrollTop > 400 : false
          setShowScrollTop(containerScroll)
          ticking = false
        })
        ticking = true
      }
    }
    const container = scrollContainerRef.current
    if (container) container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll)
    }
  }, [])
  async function ensureAccountId(): Promise<number> {
    if (form.accountId) return Number(form.accountId)
    const accounts = await api.accounts.list()
    if ((accounts as any[]).length > 0) {
      const id = (accounts as any[])[0].id
      setForm((f: any) => ({ ...f, accountId: id }))
      return id
    }
    // Provide a default `type` (required by server validation) when creating
    // the fallback account. Use 'Checking' as a sensible default.
    const created = await api.accounts.create({ name: 'Primary', type: 'Checking', initialBalance: 0 })
    setForm((f: any) => ({ ...f, accountId: (created as any).id }))
    return (created as any).id
  }

  async function createTxn(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) { alert('Please select a category.'); return }
    const acctId = await ensureAccountId()

    if (form.isRecurring) {
      // Create recurring transaction
      const recurringPayload = {
        accountId: acctId,
        categoryId: form.categoryId,
        amount: Number(form.amount),
        type: categoryMap[form.categoryId]?.type || 'Expense',
        notes: form.notes,
        frequency: form.frequency,
        startDate: form.date,
        endDate: form.endDate || undefined
      }
      const recurringTransaction = await api.recurringTransactions.create(recurringPayload)

      // Create the first transaction immediately with link to recurring transaction
      const firstTransactionPayload = {
        date: form.date,
        amount: Number(form.amount),
        accountId: acctId,
        categoryId: form.categoryId,
        notes: form.notes,
        recurringTransactionId: recurringTransaction.id
      }
      await api.transactions.create(firstTransactionPayload)
    } else {
      // Create/update normal transaction (exclude recurring fields)
      const payload = {
        date: form.date,
        amount: Number(form.amount),
        accountId: acctId,
        categoryId: form.categoryId,
        notes: form.notes,
        tagIds: formTagIds
      }
      if (editingId) await api.transactions.update(editingId, payload)
      else await api.transactions.create(payload)
    }

    setShowModal(false)
    setEditingId(null)
    setShowNotesSuggestions(false)
    setNotesSuggestions([])
    setSelectedSuggestionIndex(-1)
    setShowCategorySuggestions(false)
    setCategorySuggestions([])
    setSelectedCategoryIndex(-1)
    setForm({ date: new Date().toISOString().slice(0, 10), amount: 0, accountId: '', categoryId: '', notes: '', isRecurring: false, frequency: 'MONTHLY', endDate: '' })
    setFormTagIds([])
    refresh()
  }
  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) setOrder(order === 'asc' ? 'desc' : 'asc')
    else { setSortBy(column); setOrder('asc') }
  }

  // Bulk selection functions
  function toggleSelectAll() {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set())
      setSelectionMode(false)
    } else {
      setSelectedIds(new Set(items.map(t => t.id)))
      setSelectionMode(true)
    }
  }

  function toggleSelectItem(id: number) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)

    // Auto-manage selection mode
    if (newSelected.size > 0 && !selectionMode) {
      setSelectionMode(true)
    } else if (newSelected.size === 0 && selectionMode) {
      setSelectionMode(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) return

    try {
      await api.transactions.bulkDelete(Array.from(selectedIds))
      setItems(prev => prev.filter(t => !selectedIds.has(t.id)))
      setTotal(prev => Math.max(0, prev - selectedIds.size))
      setSelectedIds(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Error deleting transactions:', error)
      alert('Error deleting transactions')
    }
  }

  async function handleBulkUpdateCategory(categoryId: number) {
    if (selectedIds.size === 0) return

    try {
      await api.transactions.bulkUpdateCategory(Array.from(selectedIds), categoryId)
      // Update items locally
      setItems(prev => prev.map(t => {
        if (selectedIds.has(t.id)) {
          const category = categories.find(c => c.id === categoryId)
          return {
            ...t,
            categoryId,
            category,
            type: category?.type || t.type
          }
        }
        return t
      }))
      setSelectedIds(new Set())
      setShowCategoryModal(false)
      setSelectionMode(false)
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error updating category')
    }
  }

  function toggleSelectionMode() {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedIds(new Set())
    }
  }

  // Handle notes autocomplete (debounced)
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout>>()
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((f: any) => ({ ...f, notes: value }))

    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)

    if (value.length >= 2) {
      notesDebounceRef.current = setTimeout(async () => {
        try {
          const suggestions = await api.transactions.getNotes(value)
          setNotesSuggestions(suggestions as string[])
          setShowNotesSuggestions((suggestions as string[]).length > 0)
          setSelectedSuggestionIndex(-1)
        } catch { /* ignore */ }
      }, 250)
    } else {
      setShowNotesSuggestions(false)
      setNotesSuggestions([])
    }
  }, [])

  function handleNotesKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showNotesSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev =>
        prev < notesSuggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : notesSuggestions.length - 1
      )
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      if (notesSuggestions.length > 0) {
        const indexToUse = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0
        setForm({ ...form, notes: notesSuggestions[indexToUse] })
        setShowNotesSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    } else if (e.key === 'Escape') {
      setShowNotesSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  function selectSuggestion(suggestion: string) {
    setForm({ ...form, notes: suggestion })
    setShowNotesSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }

  // Handle category autocomplete
  function handleCategoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setCategoryQuery(value)

    if (value.length >= 1) {
      const filtered = categories.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase())
      )
      setCategorySuggestions(filtered)
      setShowCategorySuggestions(filtered.length > 0)
      setSelectedCategoryIndex(-1)
    } else {
      setShowCategorySuggestions(false)
      setCategorySuggestions([])
    }
  }

  function handleCategoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showCategorySuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedCategoryIndex(prev =>
        prev < categorySuggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedCategoryIndex(prev =>
        prev > 0 ? prev - 1 : categorySuggestions.length - 1
      )
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      if (categorySuggestions.length > 0) {
        const indexToUse = selectedCategoryIndex >= 0 ? selectedCategoryIndex : 0
        const category = categorySuggestions[indexToUse]
        setForm({ ...form, categoryId: category.id })
        setCategoryQuery(category.name)
        setShowCategorySuggestions(false)
        setSelectedCategoryIndex(-1)
      }
    } else if (e.key === 'Escape') {
      setShowCategorySuggestions(false)
      setSelectedCategoryIndex(-1)
    }
  }

  function selectCategorySuggestion(category: any) {
    setForm({ ...form, categoryId: category.id })
    setCategoryQuery(category.name)
    setShowCategorySuggestions(false)
    setSelectedCategoryIndex(-1)
  }

  const sortIcon = useMemo(() => order === 'asc' ? '▲' : '▼', [order])
  const categoryMap = useMemo(() => {
    const m: Record<number, any> = {}
    for (const c of categories) m[c.id] = c
    return m
  }, [categories])

  const groupedCategories = useMemo(() => {
    const filtered = categories.filter(c => c.name.toLowerCase().includes(categoryQuery.toLowerCase()));
    const groups: Record<string, any[]> = { 'Expense': [], 'Income': [], 'Transfer': [] };

    filtered.forEach(c => {
      if (groups[c.type]) {
        groups[c.type].push(c);
      }
    });

    // Sort each group alphabetically
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [categories, categoryQuery]);

  // Helpers for the sidebar layout
  const [minAmount, setMinAmount] = useState(0)
  const [maxAmount, setMaxAmount] = useState(10000)
  const [sliderMax, setSliderMax] = useState(10000)

  // Category color mapping for dots
  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'Income': return { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
      case 'Transfer': return { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' }
      default: return { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' }
    }
  }

  // Get day of week label
  const getDayOfWeek = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { weekday: 'long' })
    } catch { return '' }
  }

  // Unique category names for filter dropdown
  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>()
    return categories.filter(c => {
      if (seen.has(c.name)) return false
      seen.add(c.name)
      return true
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  return (
    <div className="flex flex-col h-full bg-stone-50 dark:bg-stone-900 border-none overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between z-20 shadow-sm relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`p-2 rounded-lg transition-colors ${isFiltersOpen ? 'bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-white' : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-700/50'}`}
            title="Toggle Filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white hidden sm:block">Transactions</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setForm({ date: new Date().toISOString().slice(0, 10), amount: 0, accountId: form.accountId || '', categoryId: '', notes: '', isRecurring: false, frequency: 'MONTHLY', endDate: '' });
              setCategoryQuery('');
              setEditingId(null);
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 text-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ════════ LEFT SIDEBAR (Collapsible) ════════ */}
        <div className={`${isFiltersOpen ? 'w-[280px]' : 'w-0'} hidden lg:flex flex-col shrink-0 bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 overflow-hidden transition-all duration-300`}>
          <div className="w-[280px] p-4 overflow-y-auto hide-scrollbar h-full">
            <div className="flex items-center gap-2 mb-5">
              <svg className="w-5 h-5 text-stone-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
              <h3 className="text-base font-bold text-stone-900 dark:text-white uppercase tracking-wider">Filters</h3>
            </div>

            {/* Search */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Date Range</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2.5 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:ring-1 focus:ring-blue-500 outline-none mb-1.5" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2.5 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>

            {/* Type */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Type</label>
              <div className="flex flex-col gap-1">
                {['', 'Income', 'Expense', 'Transfer'].map(type => (
                  <button
                    key={type || 'all'}
                    onClick={() => setTxnType(type)}
                    className={`text-left px-3 py-2 text-sm rounded-lg transition-colors ${txnType === type ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700/50'}`}
                  >
                    {type || 'All Types'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tag */}
            {allTags.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Tag</label>
                <select
                  value={selectedTagFilter}
                  onChange={e => setSelectedTagFilter(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Filters */}
            {(startDate || endDate || selectedCategory || searchQuery || txnType || selectedTagFilter) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); setTxnType(''); setSelectedTagFilter('') }}
                className="w-full py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ════════ TABLE AREA ════════ */}
        <div className="flex-1 relative flex flex-col z-0 overflow-hidden transition-all duration-300">
          <div className="p-0 sm:p-2 h-full flex flex-col">

            {/* Mobile: inline filter bar (lg:hidden) */}
            <div className="lg:hidden flex flex-col gap-2 px-3 py-2 border-b border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/50">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:ring-1 focus:ring-blue-500 outline-none min-w-0 w-28" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1.5 text-xs bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 focus:ring-1 focus:ring-blue-500 outline-none min-w-0 w-28" />
              </div>
              {(startDate || endDate || selectedCategory || searchQuery || txnType) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); setTxnType('') }}
                  className="w-full py-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden flex-1 overflow-y-auto hide-scrollbar">
              <div className="space-y-3 p-3">
                {items.map(t => (
                  <MobileTransactionCard
                    key={t.id}
                    transaction={t}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    toggleSelectItem={toggleSelectItem}
                    categoryMap={categoryMap}
                    setEditingId={setEditingId}
                    setForm={setForm}
                    setCategoryQuery={setCategoryQuery}
                    setShowModal={setShowModal}
                    setItems={setItems}
                    setTotal={setTotal}
                    setFormTagIds={setFormTagIds}
                  />
                ))}
              </div>
              <div className="py-3 text-center text-sm text-stone-500 dark:text-stone-400">
                {loading ? 'Loading…' : (items.length >= total ? `All ${total} transactions loaded` : `${items.length} of ${total}`)}
              </div>
            </div>

            {/* Desktop Table with Rounded Borders */}
            <div className="hidden sm:flex flex-col flex-1 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden min-h-0 bg-white dark:bg-stone-800">
              {/* Desktop Table Header */}
              <div className="shrink-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left select-none border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60">
                      {selectionMode && (
                        <th className="p-3 w-[40px]">
                          <input type="checkbox" checked={items.length > 0 && selectedIds.size === items.length} onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500" />
                        </th>
                      )}
                      <th className="p-3 w-[20%] text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider cursor-pointer hover:text-stone-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('date')}>Date {sortBy === 'date' && <span className="text-blue-500">{sortIcon}</span>}</th>
                      <th className="p-3 w-[20%] text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider cursor-pointer hover:text-stone-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('amount')}>Amount {sortBy === 'amount' && <span className="text-blue-500">{sortIcon}</span>}</th>
                      <th className="p-3 w-[25%] text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider cursor-pointer hover:text-stone-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('categoryId')}>Category {sortBy === 'categoryId' && <span className="text-blue-500">{sortIcon}</span>}</th>
                      <th className="p-3 w-[35%] text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider cursor-pointer hover:text-stone-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('notes')}>Notes {sortBy === 'notes' && <span className="text-blue-500">{sortIcon}</span>}</th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Scrollable Content Area */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto hide-scrollbar">
                {/* Desktop Table View */}
                <div>
                  <table className="w-full text-sm">
                    <tbody>
                      {items.map(t => {
                        const catType = (t as any).type || categoryMap[t.categoryId]?.type || t.category?.type || 'Expense'
                        const colors = getCategoryColor(catType)
                        return (
                          <tr key={t.id} className="group border-b border-stone-100 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 relative transition-colors">
                            {selectionMode && (
                              <td className="p-3 w-[40px]">
                                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelectItem(t.id)}
                                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500"
                                  onClick={e => e.stopPropagation()} />
                              </td>
                            )}
                            <td className="p-3 w-[20%]">
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{formatDateDMY(t.date)}</div>
                                  <div className="text-[11px] text-stone-400 dark:text-stone-500">{getDayOfWeek(t.date)}</div>
                                </div>
                                {(t as any).recurringTransactionId && (
                                  <span className="text-yellow-500 text-xs" title="Recurring">⟳</span>
                                )}
                              </div>
                            </td>
                            <td className={`p-3 w-[20%] font-semibold tabular-nums ${colors.text}`}>
                              <PrivacyNumber value={t.amount}>
                                {formatEUR(t.amount)}
                              </PrivacyNumber>
                            </td>
                            <td className="p-3 w-[25%]">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`}></span>
                                <span className={`text-sm font-medium ${colors.text}`}>
                                  {t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 w-[35%] text-stone-500 dark:text-stone-400 italic text-sm truncate max-w-0">
                              <div className="flex items-center gap-2 truncate">
                                <span className="truncate">{t.notes}</span>
                                {t.tags?.length > 0 && (
                                  <div className="flex gap-1 shrink-0">
                                    {t.tags.map((tag: any) => (
                                      <span key={tag.id} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white not-italic" style={{ backgroundColor: tag.color }}>
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Floating action buttons on hover */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                              <div className="flex items-center gap-1 bg-white dark:bg-stone-800 rounded-lg shadow-md border border-stone-200 dark:border-stone-700 px-1 py-1">
                                <input type="checkbox" checked={selectedIds.has(t.id)}
                                  onChange={e => { e.stopPropagation(); toggleSelectItem(t.id) }}
                                  className="mx-1 w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500 cursor-pointer" />
                                <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1"></div>
                                <button title="Edit" onClick={() => {
                                  setEditingId(t.id);
                                  const category = categoryMap[t.categoryId] || t.category;
                                  setForm({ date: String(t.date).slice(0, 10), amount: t.amount, accountId: t.accountId, categoryId: t.categoryId, notes: t.notes || '', isRecurring: false, frequency: 'MONTHLY', endDate: '' });
                                  setCategoryQuery(category?.name || '');
                                  setFormTagIds(t.tags?.map((tg: Tag) => tg.id) || []);
                                  setShowModal(true);
                                }} className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z" /></svg>
                                </button>
                                <button title="Delete" onClick={async () => { try { await api.transactions.remove(t.id); setItems(prev => prev.filter(x => x.id !== t.id)); setTotal(prev => Math.max(0, prev - 1)) } catch { } }}
                                  className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z" /></svg>
                                </button>
                              </div>
                            </div>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="py-3 text-center text-sm text-stone-500 dark:text-stone-400">
                  {loading ? 'Loading…' : (items.length >= total ? `All ${total} transactions loaded` : `${items.length} of ${total}`)}
                </div>
              </div>
            </div> {/* End rounded table wrapper */}

          </div>

          {/* Scroll To Top */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="btn-primary fixed bottom-6 right-6 z-30 !p-3 !rounded-full shadow-lg shadow-stone-900/20 hover:-translate-y-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Actions */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-full shadow-xl shadow-stone-900/20 animate-in slide-in-from-bottom-10 fade-in duration-200">
          <span className="font-medium whitespace-nowrap text-sm pl-1">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-stone-700 dark:bg-stone-300 mx-1"></div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-3 py-1.5 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 rounded-lg transition-colors"
          >
            Change Category
          </button>
          <button
            onClick={() => setShowBulkTagModal(true)}
            className="px-3 py-1.5 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 rounded-lg transition-colors"
          >
            Add Tags
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 text-sm font-medium text-red-400 dark:text-red-600 hover:bg-red-900/30 dark:hover:bg-red-100 rounded-lg transition-colors"
          >
            Delete
          </button>
          <div className="h-4 w-px bg-stone-700 dark:bg-stone-300 mx-1"></div>
          <button
            onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
            className="p-1 hover:bg-stone-800 dark:hover:bg-stone-200 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}


      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-white dark:bg-stone-900 sm:bg-black/60 p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-white dark:bg-stone-900 sm:rounded-2xl shadow-none sm:shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95">

            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center shrink-0 bg-white dark:bg-stone-900 z-10">
              <div>
                <h3 className="font-bold text-xl text-stone-900 dark:text-white">
                  {editingId ? 'Edit Transaction' : 'New Transaction'}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Enter transaction details below</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditingId(null); setShowNotesSuggestions(false); setNotesSuggestions([]); setSelectedSuggestionIndex(-1); setShowCategorySuggestions(false); setCategorySuggestions([]); setSelectedCategoryIndex(-1) }}
                className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={createTxn} className="flex-1 overflow-y-auto p-6 space-y-5 hide-scrollbar">

              {/* Amount Input - Prominent */}
              <div>
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg font-medium">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-2xl font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-stone-300 dark:placeholder-stone-600"
                    autoFocus={!editingId}
                  />
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-base font-medium text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none min-w-0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Category</label>

                {/* Selected Category Display */}
                {form.categoryId && categoryMap[form.categoryId] ? (
                  <div
                    onClick={() => {
                      setCategoryQuery('');
                      setForm({ ...form, categoryId: '' });
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-2 transition-all ${categoryMap[form.categoryId].type === 'Income'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50'
                      : categoryMap[form.categoryId].type === 'Transfer'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'
                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${categoryMap[form.categoryId].type === 'Income' ? 'bg-emerald-500' :
                        categoryMap[form.categoryId].type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                        }`}></div>
                      <span className={`font-bold ${categoryMap[form.categoryId].type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' :
                        categoryMap[form.categoryId].type === 'Transfer' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
                        }`}>
                        {categoryMap[form.categoryId].name}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-400">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-stone-400">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      placeholder="Search category..."
                      value={categoryQuery}
                      onChange={handleCategoryChange}
                      onKeyDown={handleCategoryKeyDown}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      onFocus={() => categoryQuery.length >= 1 && categorySuggestions.length > 0 && setShowCategorySuggestions(true)}
                      className="w-full pl-11 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-base font-medium text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />

                    {/* Suggestions Dropdown */}
                    {showCategorySuggestions && categorySuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl shadow-xl max-h-60 overflow-y-auto hide-scrollbar">
                        {categorySuggestions.map((c, index) => (
                          <div
                            key={c.id}
                            onClick={() => selectCategorySuggestion(c)}
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${index === selectedCategoryIndex ? 'bg-stone-50 dark:bg-stone-700/50' : ''
                              }`}
                          >
                            <span className="font-medium text-stone-900 dark:text-white">{c.name}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${c.type === 'Income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              c.type === 'Transfer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                              }`}>
                              {c.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Category List (when no category selected) */}
                {!form.categoryId && (
                  <div className="mt-3 max-h-48 overflow-y-auto hide-scrollbar border border-stone-100 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900">
                    {['Expense', 'Income', 'Transfer'].map(type => {
                      const group = groupedCategories[type];
                      if (!group || group.length === 0) return null;
                      return (
                        <div key={type}>
                          <div className="px-4 py-2 text-[10px] font-bold text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800 uppercase tracking-wider sticky top-0 border-b border-stone-100 dark:border-stone-800">
                            {type}
                          </div>
                          {group.map((c: any) => (
                            <div
                              key={c.id}
                              onClick={() => { setForm({ ...form, categoryId: c.id }); setCategoryQuery(c.name) }}
                              className="px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 border-b border-stone-50 dark:border-stone-800 last:border-0 flex items-center gap-3 transition-colors"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${c.type === 'Income' ? 'bg-emerald-500' :
                                c.type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                                }`}></div>
                              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Notes</label>
                <div className="relative">
                  {showNotesSuggestions && notesSuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl shadow-xl max-h-40 overflow-y-auto hide-scrollbar">
                      {notesSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => selectSuggestion(suggestion)}
                          className={`px-4 py-2.5 cursor-pointer text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50 ${index === selectedSuggestionIndex ? 'bg-stone-50 dark:bg-stone-700/50' : ''
                            }`}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    value={form.notes}
                    onChange={handleNotesChange}
                    onKeyDown={handleNotesKeyDown}
                    onBlur={() => setTimeout(() => setShowNotesSuggestions(false), 200)}
                    onFocus={() => form.notes.length >= 2 && notesSuggestions.length > 0 && setShowNotesSuggestions(true)}
                    placeholder="Add a note..."
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-base font-medium text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-stone-400"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const selected = formTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setFormTagIds(prev => selected ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selected ? 'text-white border-transparent shadow-sm' : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'}`}
                        style={selected ? { backgroundColor: tag.color } : undefined}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected ? 'rgba(255,255,255,0.6)' : tag.color }} />
                        {tag.name}
                      </button>
                    )
                  })}

                  {/* Inline new tag creation */}
                  {!showNewTagInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNewTagInput(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:text-stone-700 dark:hover:text-stone-200 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      New Tag
                    </button>
                  ) : (
                    <div className="w-full mt-2 p-3 bg-stone-50 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2.5 animate-in slide-in-from-top-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        placeholder="Tag name..."
                        autoFocus
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (!newTagName.trim()) return
                            const created = await api.tags.create({ name: newTagName.trim(), color: newTagColor })
                            setAllTags(prev => [...prev, created])
                            setFormTagIds(prev => [...prev, created.id])
                            setNewTagName('')
                            setNewTagColor('#6366f1')
                            setShowNewTagInput(false)
                          } else if (e.key === 'Escape') {
                            setShowNewTagInput(false)
                            setNewTagName('')
                          }
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        {TAG_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTagColor(c)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${newTagColor === c ? 'border-stone-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowNewTagInput(false); setNewTagName('') }}
                          className="px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newTagName.trim()) return
                            const created = await api.tags.create({ name: newTagName.trim(), color: newTagColor })
                            setAllTags(prev => [...prev, created])
                            setFormTagIds(prev => [...prev, created.id])
                            setNewTagName('')
                            setNewTagColor('#6366f1')
                            setShowNewTagInput(false)
                          }}
                          disabled={!newTagName.trim()}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-stone-100 disabled:opacity-40 transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recurring Toggle */}
              {!editingId && (
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={form.isRecurring}
                        onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-stone-300 dark:border-stone-600 transition-all checked:border-blue-500 checked:bg-blue-500"
                      />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Recurring Transaction</span>
                  </label>

                  {form.isRecurring && (
                    <div className="mt-3 pl-3 border-l-2 border-stone-100 dark:border-stone-800 space-y-3 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">Frequency</label>
                        <div className="relative">
                          <div
                            onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                            className={`w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-900 dark:text-white cursor-pointer flex items-center justify-between transition-all ${showFrequencyDropdown ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                          >
                            <span>
                              {form.frequency === 'WEEKLY' && 'Weekly'}
                              {form.frequency === 'BIWEEKLY' && 'Every 2 weeks'}
                              {form.frequency === 'MONTHLY' && 'Monthly'}
                              {form.frequency === 'BIMONTHLY' && 'Every 2 months'}
                              {form.frequency === 'QUARTERLY' && 'Quarterly'}
                              {form.frequency === 'YEARLY' && 'Yearly'}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 text-stone-500 dark:text-stone-400 transition-transform ${showFrequencyDropdown ? 'rotate-180' : ''}`}>
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>

                          {showFrequencyDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowFrequencyDropdown(false)}></div>
                              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {[
                                  { val: 'WEEKLY', label: 'Weekly' },
                                  { val: 'BIWEEKLY', label: 'Every 2 weeks' },
                                  { val: 'MONTHLY', label: 'Monthly' },
                                  { val: 'BIMONTHLY', label: 'Every 2 months' },
                                  { val: 'QUARTERLY', label: 'Quarterly' },
                                  { val: 'YEARLY', label: 'Yearly' }
                                ].map(opt => (
                                  <div
                                    key={opt.val}
                                    onClick={() => { setForm({ ...form, frequency: opt.val }); setShowFrequencyDropdown(false); }}
                                    className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${form.frequency === opt.val
                                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                      : 'text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/50'
                                      }`}
                                  >
                                    {opt.label}
                                    {form.frequency === opt.val && (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">End Date (Optional)</label>
                        <div className="relative flex items-center">
                          <input
                            type="date"
                            value={form.endDate}
                            onChange={e => setForm({ ...form, endDate: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <div className="absolute right-4 pointer-events-none text-stone-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Footer Actions */}
            <div className="p-6 pb-8 sm:pb-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
              <button
                onClick={createTxn}
                disabled={!form.categoryId || !form.amount}
                className="btn-primary w-full !py-3.5 !font-bold shadow-lg shadow-stone-500/20 hover:shadow-stone-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Save Transaction
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Category Selection Modal for Bulk Update */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Select Category</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              Change category for {selectedIds.size} selected transactions
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto hide-scrollbar mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleBulkUpdateCategory(cat.id)}
                  className="w-full text-left px-4 py-3 rounded border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cat.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${cat.type === 'Income'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : cat.type === 'Transfer'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                      {cat.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Add Tags</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              Select tags to add to {selectedIds.size} selected transactions
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {allTags.map(tag => {
                const selected = formTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => setFormTagIds(prev => selected ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all border ${selected ? 'text-white border-transparent shadow-sm' : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'}`}
                    style={selected ? { backgroundColor: tag.color } : undefined}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selected ? 'rgba(255,255,255,0.6)' : tag.color }} />
                    {tag.name}
                  </button>
                )
              })}
            </div>
            {allTags.length === 0 && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">No tags available. Create tags in Settings first.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowBulkTagModal(false); setFormTagIds([]) }}
                className="px-4 py-2 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (formTagIds.length === 0) return
                  await api.transactions.bulkUpdateTags(Array.from(selectedIds), formTagIds)
                  setShowBulkTagModal(false)
                  setFormTagIds([])
                  setSelectedIds(new Set())
                  setSelectionMode(false)
                  refresh()
                }}
                disabled={formTagIds.length === 0}
                className="px-4 py-2 rounded bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 disabled:opacity-50"
              >
                Apply Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


