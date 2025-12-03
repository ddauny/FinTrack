import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
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
  setTotal
}: any) {
  const [showMenu, setShowMenu] = useState(false);
  const t = transaction;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          {selectionMode && (
            <input
              type="checkbox"
              checked={selectedIds.has(t.id)}
              onChange={() => toggleSelectItem(t.id)}
              className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatDateDMY(t.date)}</div>
              <div className={`text-lg font-bold ${
                ((t as any).type==='Income' || categoryMap[t.categoryId]?.type==='Income' || t.category?.type==='Income') ? 'text-green-600 dark:text-green-400' : 
                ((t as any).type==='Transfer' || categoryMap[t.categoryId]?.type==='Transfer' || t.category?.type==='Transfer') ? 'text-blue-600 dark:text-blue-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                <PrivacyNumber value={t.amount}>
                  {formatEUR(t.amount)}
                </PrivacyNumber>
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}</div>
            {t.notes && <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">{t.notes}</div>}
            {(t as any).recurringTransactionId && (
              <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                ⟳ Recurring
              </div>
            )}
          </div>
        </div>
        
        {/* Menu 3 puntini */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button 
                  onClick={()=>{ 
                    setShowMenu(false);
                    setEditingId(t.id); 
                    const category = categoryMap[t.categoryId] || t.category;
                    setForm({ 
                      date: String(t.date).slice(0,10), 
                      amount: t.amount, 
                      accountId: t.accountId, 
                      categoryId: t.categoryId, 
                      notes: t.notes||'',
                      isRecurring: false,
                      frequency: 'MONTHLY',
                      endDate: ''
                    }); 
                    setCategoryQuery(category?.name || '');
                    setShowModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z"/>
                    <path d="M5.25 19.5h13.5"/>
                  </svg>
                  Edit
                </button>
                <button 
                  onClick={async()=>{ 
                    setShowMenu(false);
                    if(!confirm('Delete this transaction?')) return;
                    try { 
                      await api.transactions.remove(t.id); 
                      setItems((prev: any[])=> prev.filter(x=> x.id!==t.id)); 
                      setTotal((prev: number)=> Math.max(0, prev-1)); 
                    } catch { /* ignore */ } 
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/>
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
  const [editingId, setEditingId] = useState<number|null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  
  // Debug log for items changes
  useEffect(() => {
    console.log('Items state changed:', items.length, 'items')
    if (items.length > 0) {
      console.log('First item:', items[0])
    }
  }, [items])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialAutoRefreshSkipped = useRef(false)
  const initialLoadDone = useRef(false)
  const initialFetchStarted = useRef(false)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), amount: 0, accountId: '', categoryId: '', notes: '', isRecurring: false, frequency: 'MONTHLY', endDate: '' })
  const [categoryQuery, setCategoryQuery] = useState('')
  const [notesSuggestions, setNotesSuggestions] = useState<string[]>([])
  const [showNotesSuggestions, setShowNotesSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [categorySuggestions, setCategorySuggestions] = useState<any[]>([])
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1)
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false)
  const [sortBy, setSortBy] = useState<'date'|'amount'|'type'|'accountId'|'categoryId'|'notes'>('date')
  const [order, setOrder] = useState<'asc'|'desc'>('desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [txnType, setTxnType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 20

  async function fetchPage(p: number, mode: 'replace'|'append' = 'replace') {
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
      console.log('Frontend filtering by category:', selectedCategory)
    }
    if (txnType && !query.includes('&type=')) {
      query += `&type=${encodeURIComponent(txnType)}`
      console.log('Frontend filtering by type:', txnType)
    }
    if (searchQuery.trim() && !query.includes('&search=')) {
      query += `&search=${encodeURIComponent(searchQuery.trim())}`
      console.log('Frontend filtering by search:', searchQuery.trim())
    }
    
    const res: any = await api.transactions.list(query)
    console.log('Frontend received data:', {
      total: res.total,
      itemsCount: res.items?.length,
      category: selectedCategory,
      query,
      items: res.items
    })
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
      if (receivedItems.length !== beforeCount) console.log(`Defensive filtered out ${beforeCount - receivedItems.length} items not matching type=${effectiveType}`)
    }
    console.log('Setting items to:', receivedItems)
    setTotal(res.total || 0)
    if (mode === 'replace') {
      setItems(receivedItems)
      console.log('Items set to:', receivedItems)
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
    
    console.log('Reading URL parameters:', { urlStartDate, urlEndDate, urlCategory });
    
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
        console.log('Initial URL-driven fetch with query:', query)
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
          if (receivedItems.length !== beforeCount) console.log(`Defensive filtered out ${beforeCount - receivedItems.length} items not matching type=${effectiveTypeLocal}`)
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
    Promise.all([api.accounts.list(), api.categories.list()]).then(([accs, cats])=>{
      setCategories(cats as any[])
      if (!form.accountId && (accs as any[])[0]) setForm((f:any)=>({ ...f, accountId: (accs as any[])[0].id }))
      if (!form.categoryId && (cats as any[])[0]) setForm((f:any)=>({ ...f, categoryId: (cats as any[])[0].id }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // re-fetch on sort change or filter change
  useEffect(()=>{ 
    // If the initial URL-driven fetch hasn't completed yet, don't trigger
    // automatic refreshes — they would race and may overwrite the URL-driven results.
    if (!initialLoadDone.current) {
      return
    }

    setPage(1); // Reset to first page when filters change
    setItems([]); // Clear existing items to prevent duplicates
    // Force refresh with new parameters
    setTimeout(() => refresh(), 50); // Small delay to ensure state is updated
  }, [sortBy, order, startDate, endDate, selectedCategory, searchQuery, txnType])

  // infinite scroll on scrollable container
  useEffect(()=>{
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
    
    window.addEventListener('scroll', onScroll)
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', onScroll)
    }
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (container) container.removeEventListener('scroll', onScroll)
    }
  }, [items.length, total, loading, page])
  async function ensureAccountId(): Promise<number> {
    if (form.accountId) return Number(form.accountId)
    const accounts = await api.accounts.list()
    if ((accounts as any[]).length > 0) {
      const id = (accounts as any[])[0].id
      setForm((f:any)=>({ ...f, accountId: id }))
      return id
    }
    const created = await api.accounts.create({ name: 'Primary', initialBalance: 0 })
    setForm((f:any)=>({ ...f, accountId: (created as any).id }))
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
        notes: form.notes
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
    setForm({ date: new Date().toISOString().slice(0,10), amount: 0, accountId: '', categoryId: '', notes: '', isRecurring: false, frequency: 'MONTHLY', endDate: '' })
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

  // Handle notes autocomplete
  async function handleNotesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setForm({...form, notes: value})
    
    if (value.length >= 2) {
      try {
        const suggestions = await api.transactions.getNotes(value)
        setNotesSuggestions(suggestions as string[])
        setShowNotesSuggestions((suggestions as string[]).length > 0)
        setSelectedSuggestionIndex(-1)
      } catch (error) {
        console.error('Error fetching notes suggestions:', error)
      }
    } else {
      setShowNotesSuggestions(false)
      setNotesSuggestions([])
    }
  }

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
        setForm({...form, notes: notesSuggestions[indexToUse]})
        setShowNotesSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    } else if (e.key === 'Escape') {
      setShowNotesSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  function selectSuggestion(suggestion: string) {
    setForm({...form, notes: suggestion})
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
        setForm({...form, categoryId: category.id})
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
    setForm({...form, categoryId: category.id})
    setCategoryQuery(category.name)
    setShowCategorySuggestions(false)
    setSelectedCategoryIndex(-1)
  }

  const sortIcon = useMemo(() => order === 'asc' ? '▲' : '▼', [order])
  const categoryMap = useMemo(()=>{
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

  return (
    <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded shadow flex flex-col sm:h-[calc(100vh-120px)]">
      {/* Fixed Header with Filters */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-1">
          
          {/* Toolbar Container */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Search & Filters Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 bg-slate-50 dark:bg-slate-900/50 p-2 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              
              {/* Search */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-1.5 border-none rounded-lg bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-0 focus:outline-none sm:text-sm"
                />
              </div>

              {/* Divider - Hidden on mobile */}
              <div className="hidden sm:block h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

              {/* Date Range */}
              <div className="flex items-center justify-between sm:justify-start bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 px-2 py-1.5 shadow-sm gap-2">
                <div className="flex items-center gap-1.5 relative">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none">
                    <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4h.25V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                  </svg>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e=>setStartDate(e.target.value)} 
                    className="bg-transparent border-none text-slate-700 dark:text-slate-300 text-sm focus:ring-0 p-0 w-full sm:w-[110px] cursor-pointer min-w-[90px]"
                    placeholder="Start Date"
                  />
                </div>
                
                <span className="text-slate-400">→</span>
                
                <div className="flex items-center gap-1.5 relative">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none">
                    <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4h.25V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                  </svg>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e=>setEndDate(e.target.value)} 
                    className="bg-transparent border-none text-slate-700 dark:text-slate-300 text-sm focus:ring-0 p-0 w-full sm:w-[110px] cursor-pointer min-w-[90px]"
                    placeholder="End Date"
                  />
                </div>
              </div>

              {/* Clear Filters Button - Desktop */}
              {(startDate || endDate || selectedCategory || searchQuery || txnType) && (
                 <>
                 <div className="hidden sm:block h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                 <button 
                  onClick={()=>{setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); setTxnType('')}} 
                  className="hidden sm:block p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Clear all filters"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
                </>
              )}
            </div>

            {/* Add Button */}
            <button 
              onClick={()=>{
                setForm({ 
                  date: new Date().toISOString().slice(0,10), 
                  amount: 0, 
                  accountId: form.accountId || '', 
                  categoryId: '', 
                  notes: '',
                  isRecurring: false,
                  frequency: 'MONTHLY',
                  endDate: ''
                });
                setCategoryQuery('');
                setEditingId(null);
                setShowModal(true);
              }} 
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-sm hover:shadow-md w-full sm:w-auto" 
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Transaction
            </button>
          </div>

          {/* Mobile Clear Filters Button */}
          {(startDate || endDate || selectedCategory || searchQuery || txnType) && (
            <button 
              onClick={()=>{setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); setTxnType('')}} 
              className="sm:hidden flex items-center justify-center gap-2 w-full p-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>

        {/* Bulk Actions Bar (conditionally rendered) */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="mt-3 flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
            <button
              onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
            >
              Change Category
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
            <button
              onClick={handleBulkDelete}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      
      {/* Desktop Table Header - Fixed */}
      <div className="hidden sm:block flex-shrink-0 rounded-t-lg overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-white border-b border-slate-800">
              <tr className="text-left select-none">
                {selectionMode && (
                  <th className="p-3 w-[40px]">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 text-slate-500 focus:ring-slate-500 bg-slate-800"
                    />
                  </th>
                )}
                <th className="p-3 cursor-pointer w-[25%] font-medium hover:bg-slate-800 transition-colors" onClick={()=>toggleSort('date')}>Date {sortBy==='date' && sortIcon}</th>
                <th className="p-3 cursor-pointer w-[25%] font-medium hover:bg-slate-800 transition-colors" onClick={()=>toggleSort('amount')}>Amount {sortBy==='amount' && sortIcon}</th>
                <th className="p-3 cursor-pointer w-[25%] font-medium hover:bg-slate-800 transition-colors" onClick={()=>toggleSort('categoryId')}>Category {sortBy==='categoryId' && sortIcon}</th>
                <th className="p-3 cursor-pointer w-[25%] font-medium hover:bg-slate-800 transition-colors hidden sm:table-cell" onClick={()=>toggleSort('notes')}>Notes {sortBy==='notes' && sortIcon}</th>
              </tr>
            </thead>
          </table>
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div ref={scrollContainerRef} className="flex-1 sm:overflow-y-auto hide-scrollbar">
        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3 p-2">
        {items.map((t)=> (
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
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full text-sm">
          <tbody>
            {/* Debug: {console.log('Rendering items:', items.length, 'items')} */}
            {items.map((t)=> (
              <tr key={t.id} className="group border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 relative transition-colors">
                {selectionMode && (
                  <td className="p-3 w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelectItem(t.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td className="p-3 w-[25%] dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-gray-100">{formatDateDMY(t.date)}</span>
                    {(t as any).recurringTransactionId && (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-600 dark:text-yellow-400 text-xs font-medium" title="Recurring transaction">
                        ⟳
                      </span>
                    )}
                  </div>
                </td>
                <td className={`p-3 w-[25%] font-semibold tabular-nums ${
                  ((t as any).type==='Income' || categoryMap[t.categoryId]?.type==='Income' || t.category?.type==='Income') ? 'text-emerald-600 dark:text-emerald-400' : 
                  ((t as any).type==='Transfer' || categoryMap[t.categoryId]?.type==='Transfer' || t.category?.type==='Transfer') ? 'text-blue-600 dark:text-blue-400' :
                  'text-rose-600 dark:text-rose-400'
                }`}>
                  <PrivacyNumber value={t.amount}>
                    {formatEUR(t.amount)}
                  </PrivacyNumber>
                </td>
                <td className="p-3 w-[25%] dark:text-gray-200">
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}
                  </span>
                </td>
                <td className="p-3 w-[25%] hidden sm:table-cell text-gray-500 dark:text-gray-400 italic">{t.notes}</td>
                
                {/* Floating action buttons on hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-1 py-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectItem(t.id);
                      }}
                      className="mx-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500 cursor-pointer"
                    />
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button title="Edit" onClick={()=>{ 
                      setEditingId(t.id); 
                      const category = categoryMap[t.categoryId] || t.category;
                      setForm({ 
                        date: String(t.date).slice(0,10), 
                        amount: t.amount, 
                        accountId: t.accountId, 
                        categoryId: t.categoryId, 
                        notes: t.notes||'',
                        isRecurring: false,
                        frequency: 'MONTHLY',
                        endDate: ''
                      }); 
                      setCategoryQuery(category?.name || '');
                      setShowModal(true);
                    }} className="p-1.5 text-xs text-gray-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors" aria-label="Edit Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z"/><path d="M5.25 19.5h13.5"/></svg>
                    </button>
                    <button title="Delete" onClick={async()=>{ try { await api.transactions.remove(t.id); setItems(prev=> prev.filter(x=> x.id!==t.id)); setTotal(prev=> Math.max(0, prev-1)); } catch { /* ignore */ } }} className="p-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" aria-label="Delete Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
                    </button>
                  </div>
                </div>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="py-3 text-center text-sm text-gray-600 dark:text-gray-300">
        {loading ? 'Loading…' : (items.length >= total ? 'All loaded' : '')}
      </div>
      </div>
      {/* End of Scrollable Content Area */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-white dark:bg-gray-900 sm:bg-black/60 sm:backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-white dark:bg-gray-900 sm:rounded-2xl shadow-none sm:shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0 bg-white dark:bg-gray-900 z-10">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                  {editingId ? 'Edit Transaction' : 'New Transaction'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enter transaction details below</p>
              </div>
              <button 
                onClick={()=>{ setShowModal(false); setEditingId(null); setShowNotesSuggestions(false); setNotesSuggestions([]); setSelectedSuggestionIndex(-1); setShowCategorySuggestions(false); setCategorySuggestions([]); setSelectedCategoryIndex(-1) }}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">€</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={form.amount} 
                    onChange={e=>setForm({...form, amount:e.target.value})} 
                    placeholder="0.00" 
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-300 dark:placeholder-gray-600"
                    autoFocus={!editingId}
                  />
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={e=>setForm({...form, date:e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none min-w-0" 
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
                
                {/* Selected Category Display */}
                {form.categoryId && categoryMap[form.categoryId] ? (
                  <div 
                    onClick={() => {
                      setCategoryQuery('');
                      setForm({...form, categoryId: ''});
                    }}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl cursor-pointer border-2 transition-all ${
                      categoryMap[form.categoryId].type === 'Income' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' 
                        : categoryMap[form.categoryId].type === 'Transfer'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'
                        : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        categoryMap[form.categoryId].type === 'Income' ? 'bg-emerald-500' : 
                        categoryMap[form.categoryId].type === 'Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                      }`}></div>
                      <span className={`font-bold ${
                        categoryMap[form.categoryId].type === 'Income' ? 'text-emerald-700 dark:text-emerald-400' : 
                        categoryMap[form.categoryId].type === 'Transfer' ? 'text-blue-700 dark:text-blue-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {categoryMap[form.categoryId].name}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
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
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    
                    {/* Suggestions Dropdown */}
                    {showCategorySuggestions && categorySuggestions.length > 0 && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto hide-scrollbar">
                        {categorySuggestions.map((c, index) => (
                          <div
                            key={c.id}
                            onClick={() => selectCategorySuggestion(c)}
                            className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                              index === selectedCategoryIndex ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                            }`}
                          >
                            <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              c.type==='Income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                              c.type==='Transfer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
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
                  <div className="mt-3 max-h-48 overflow-y-auto hide-scrollbar border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
                    {['Expense', 'Income', 'Transfer'].map(type => {
                      const group = groupedCategories[type];
                      if (!group || group.length === 0) return null;
                      return (
                        <div key={type}>
                          <div className="px-4 py-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wider sticky top-0 border-b border-gray-100 dark:border-gray-800">
                            {type}
                          </div>
                          {group.map((c: any) => (
                            <div
                              key={c.id}
                              onClick={()=>{setForm({...form, categoryId: c.id}); setCategoryQuery(c.name)}}
                              className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800 last:border-0 flex items-center gap-3 transition-colors"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                c.type==='Income' ? 'bg-emerald-500' : 
                                c.type==='Transfer' ? 'bg-blue-500' : 'bg-rose-500'
                              }`}></div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{c.name}</span>
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
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Notes</label>
                <div className="relative">
                  {showNotesSuggestions && notesSuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-40 overflow-y-auto hide-scrollbar">
                      {notesSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => selectSuggestion(suggestion)}
                          className={`px-4 py-2.5 cursor-pointer text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            index === selectedSuggestionIndex ? 'bg-gray-50 dark:bg-gray-700/50' : ''
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400" 
                  />
                </div>
              </div>

              {/* Recurring Toggle */}
              {!editingId && (
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={form.isRecurring} 
                        onChange={e => setForm({...form, isRecurring: e.target.checked})}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 dark:border-gray-600 transition-all checked:border-blue-500 checked:bg-blue-500"
                      />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Recurring Transaction</span>
                  </label>
                  
                  {form.isRecurring && (
                    <div className="mt-3 pl-3 border-l-2 border-gray-100 dark:border-gray-800 space-y-3 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Frequency</label>
                        <div className="relative">
                          <div 
                            onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white cursor-pointer flex items-center justify-between transition-all ${showFrequencyDropdown ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                          >
                            <span>
                              {form.frequency === 'WEEKLY' && 'Weekly'}
                              {form.frequency === 'BIWEEKLY' && 'Every 2 weeks'}
                              {form.frequency === 'MONTHLY' && 'Monthly'}
                              {form.frequency === 'BIMONTHLY' && 'Every 2 months'}
                              {form.frequency === 'QUARTERLY' && 'Quarterly'}
                              {form.frequency === 'YEARLY' && 'Yearly'}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${showFrequencyDropdown ? 'rotate-180' : ''}`}>
                              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                          </div>
                          
                          {showFrequencyDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowFrequencyDropdown(false)}></div>
                              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
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
                                    onClick={() => { setForm({...form, frequency: opt.val}); setShowFrequencyDropdown(false); }}
                                    className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                                      form.frequency === opt.val 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">End Date (Optional)</label>
                        <div className="relative flex items-center">
                          <input 
                            type="date" 
                            value={form.endDate} 
                            onChange={e => setForm({...form, endDate: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <div className="absolute right-4 pointer-events-none text-gray-400">
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
            <div className="p-6 pb-8 sm:pb-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
              <button 
                onClick={createTxn}
                disabled={!form.categoryId || !form.amount} 
                className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg shadow-slate-500/20 hover:shadow-slate-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Select Category</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Change category for {selectedIds.size} selected transactions
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto hide-scrollbar mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleBulkUpdateCategory(cat.id)}
                  className="w-full text-left px-4 py-3 rounded border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cat.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      cat.type === 'Income' 
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
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


