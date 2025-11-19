import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'

export function TransactionsPage() {
  const [items, setItems] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number|null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [showImportInfo, setShowImportInfo] = useState(false)
  
  // Debug log for items changes
  useEffect(() => {
    console.log('Items state changed:', items.length, 'items')
    if (items.length > 0) {
      console.log('First item:', items[0])
    }
  }, [items])
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      if (!container) return
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
      const hasMore = items.length < total
      // Only trigger infinite scroll if we're not changing sort/filters
      if (nearBottom && hasMore && !loading) fetchPage(page + 1, 'append')
    }
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', onScroll)
      return () => container.removeEventListener('scroll', onScroll)
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
  // Provide a default `type` (required by server validation) when creating
  // the fallback account. Use 'Checking' as a sensible default.
  const created = await api.accounts.create({ name: 'Primary', type: 'Checking', initialBalance: 0 })
    setForm((f:any)=>({ ...f, accountId: (created as any).id }))
    return (created as any).id
  }

  async function createTxn(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) { alert('Please select a category.'); return }
    const acctId = await ensureAccountId()
<<<<<<< HEAD
    const payload = { ...form, accountId: acctId, amount: Number(form.amount) }
    try {
      if (editingId) await api.transactions.update(editingId, payload)
      else await api.transactions.create(payload)
    } catch (err: any) {
      // Show a user-friendly error and log details
      console.error('Error creating/updating transaction:', err)
      let message = 'Errore durante il salvataggio della transazione.'
      try {
        const txt = String(err.message || err)
        // if server returned JSON error body, try to parse
        const parsed = JSON.parse(txt)
        if (parsed && parsed.error) message = parsed.error
        else message = txt
      } catch (_) {
        // fallback to raw message
      }
      alert(message)
      return
    }
    // Reset the form to defaults so the modal is clean for the next add
    setForm({ date: new Date().toISOString().slice(0,10), amount: 0, accountId: '', categoryId: '', notes: '' })
    setCategoryQuery('')
=======
    
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
    
>>>>>>> main
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
  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    await api.transactions.importCsv(f)
    e.target.value = ''
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
    } else {
      setSelectedIds(new Set(items.map(t => t.id)))
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

  return (
    <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded shadow flex flex-col h-[calc(100vh-120px)]">
      {/* Fixed Header with Filters */}
      <div className="flex-shrink-0 mb-3">
        {/* Filter Controls - All in one compact row */}
        <div className="space-y-2">
          {/* Date Filters + Search + Actions in one row */}
          <div className="flex flex-wrap items-end gap-2">
            {/* From Date */}
            <div className="flex-shrink-0" style={{width: '140px'}}>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">From</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e=>setStartDate(e.target.value)} 
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* To Date */}
            <div className="flex-shrink-0" style={{width: '140px'}}>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">To</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e=>setEndDate(e.target.value)} 
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Search</label>
              <input
                type="text"
                placeholder="Category, amount, notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Clear Button */}
            <button 
              onClick={()=>{setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery('')}} 
              className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-1 focus:ring-blue-500 whitespace-nowrap h-[30px]"
              title="Clear filters"
            >
              Clear
            </button>
            
            {/* Import CSV Button */}
            <button 
              onClick={() => setShowImportInfo(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors h-[30px]" 
              title="Import CSV"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 3a1 1 0 011 1v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 13.586V4a1 1 0 011-1z"/>
                <path d="M5 20a2 2 0 01-2-2v-2a1 1 0 112 0v2h14v-2a1 1 0 112 0v2a2 2 0 01-2 2H5z"/>
              </svg>
              <span>Import</span>
            </button>
            
            {/* Add Transaction Button */}
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
              className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:ring-1 focus:ring-blue-500 h-[30px]" 
              title="Add new transaction"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              <span>Add</span>
            </button>
            
            {/* Select Button - toggles selection mode */}
            <button 
              onClick={toggleSelectionMode}
              className={`flex items-center justify-center px-3 py-1 text-sm font-medium rounded-md transition-colors h-[30px] ${
                selectionMode 
                  ? 'text-white bg-blue-600 border-blue-600 hover:bg-blue-700' 
                  : 'text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title={selectionMode ? "Exit selection mode" : "Select transactions"}
            >
              {selectionMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2.25 6a3 3 0 013-3h13.5a3 3 0 013 3v12a3 3 0 01-3 3H5.25a3 3 0 01-3-3V6zm3.97.97a.75.75 0 011.06 0l2.25 2.25a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 010-1.06zm4.28 4.28a.75.75 0 000 1.5h5.69a.75.75 0 000-1.5H10.5z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            {/* Bulk actions - shown inline when items are selected */}
            {selectionMode && selectedIds.size > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedIds.size} selected
                  </span>
                </div>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center justify-center px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 h-[30px]"
                  title="Change category"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                    <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
                  </svg>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center justify-center px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 h-[30px]"
                  title="Delete selected"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            )}
          </div>
          
          {/* Filter Indicator */}
          {(startDate || endDate || selectedCategory || searchQuery || txnType) && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-md">
                {txnType ? `Type: ${txnType}` : (selectedCategory ? `Category: ${selectedCategory}` : (searchQuery ? `Search: "${searchQuery}"` : 'Date filtered'))}
              </div>
              <button 
                onClick={()=>{setStartDate(''); setEndDate(''); setSelectedCategory(''); setSearchQuery(''); setTxnType('')}} 
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                ×
              </button>
            </div>
          )}
        </div>
<<<<<<< HEAD
          
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileSelected} className="hidden" />
          <button 
            title="Import CSV" 
            onClick={()=>fileInputRef.current?.click()} 
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500" 
            aria-label="Import CSV"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 3a1 1 0 011 1v9.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 13.586V4a1 1 0 011-1z"/>
              <path d="M5 20a2 2 0 01-2-2v-2a1 1 0 112 0v2h14v-2a1 1 0 112 0v2a2 2 0 01-2 2H5z"/>
            </svg>
            <span>Import CSV</span>
          </button>
          <button
            title="Export CSV"
            onClick={async () => {
              // Build same query used for listing (but without pagination)
              let q = `?limit=10000&sortBy=${sortBy}&order=${order}`;
              if (startDate) q += `&startDate=${startDate}`;
              if (endDate) q += `&endDate=${endDate}`;
              if (selectedCategory) q += `&category=${encodeURIComponent(selectedCategory)}`;
              if (searchQuery.trim()) q += `&search=${encodeURIComponent(searchQuery.trim())}`;
              try {
                const res: any = await api.transactions.list(q);
                const itemsToExport = res.items || [];
                if (!itemsToExport.length) { alert('Nessuna transazione da esportare'); return }
                const headers = ['date','amount','category','notes'];
                const escapeCsv = (val: any) => {
                  const str = String(val ?? '');
                  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g,'""')}"`;
                  }
                  return str;
                };
                const rows = itemsToExport.map((t: any) => ({
                  date: String(t.date).slice(0,10),
                  amount: Number(t.amount),
                  category: t.category?.name || (t.categoryId ?? ''),
                  notes: t.notes || ''
                }));
                const csv = [headers.join(',')].concat(rows.map((r: any) => headers.map(h => escapeCsv(r[h])).join(','))).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Export failed', err);
                alert('Esportazione fallita');
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 5v10m0 0-4-4m4 4 4-4M4 19h16" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Export CSV</span>
          </button>
          <button 
            title="Add Transactioooooosdsn" 
            onClick={()=>setShowModal(true)} 
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500" 
            aria-label="Add Transaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M11 11V5a1 1 0 112 0v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6z"/>
            </svg>
            <span>Add Transaction</span>
          </button>
=======
        
        <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileSelected} className="hidden" />
      </div>
      
      {/* Desktop Table Header - Fixed */}
      <div className="hidden sm:block flex-shrink-0">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-sm">
            <thead className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-left select-none">
                {selectionMode && (
                  <th className="p-2 w-[40px]">
                    <input
                      type="checkbox"
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="p-2 cursor-pointer w-[25%] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold" onClick={()=>toggleSort('date')}>Date {sortBy==='date' && sortIcon}</th>
                <th className="p-2 cursor-pointer w-[25%] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold" onClick={()=>toggleSort('amount')}>Amount {sortBy==='amount' && sortIcon}</th>
                <th className="p-2 cursor-pointer w-[25%] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold" onClick={()=>toggleSort('categoryId')}>Category {sortBy==='categoryId' && sortIcon}</th>
                <th className="p-2 cursor-pointer w-[25%] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold hidden sm:table-cell" onClick={()=>toggleSort('notes')}>Notes {sortBy==='notes' && sortIcon}</th>
              </tr>
            </thead>
          </table>
>>>>>>> main
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-2">
        {items.map((t)=> (
          <div key={t.id} className="bg-gray-50 dark:bg-gray-700/10 p-3 rounded border border-gray-200 dark:border-gray-700">
<<<<<<< HEAD
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium">{formatDateDMY(t.date)}</div>
              <div className={`text-sm font-bold ${((t as any).type==='Income' || categoryMap[t.categoryId]?.type==='Income' || t.category?.type==='Income') ? 'text-green-700' : 'text-red-700'}`}>
                <PrivacyNumber value={t.amount}>
                  {formatEUR(t.amount)}
                </PrivacyNumber>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}</div>
            {t.notes && <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.notes}</div>}
            <div className="flex gap-2">
              <button title="Edit" onClick={()=>{ setEditingId(t.id); setForm({ date: String(t.date).slice(0,10), amount: t.amount, accountId: t.accountId, categoryId: t.categoryId, notes: t.notes||'' }); setShowModal(true) }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" aria-label="Edit Transaction">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z"/><path d="M5.25 19.5h13.5"/></svg>
                Edit
              </button>
              <button title="Delete" onClick={async()=>{ try { await api.transactions.remove(t.id); setItems(prev=> prev.filter(x=> x.id!==t.id)); setTotal(prev=> Math.max(0, prev-1)); } catch { /* ignore */ } }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" aria-label="Delete Transaction">
=======
            <div className="flex items-start gap-3 mb-2">
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={() => toggleSelectItem(t.id)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium dark:text-gray-200">{formatDateDMY(t.date)}</div>
                  <div className={`text-sm font-bold ${((t as any).type==='Income' || categoryMap[t.categoryId]?.type==='Income' || t.category?.type==='Income') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <PrivacyNumber value={t.amount}>
                      {formatEUR(t.amount)}
                    </PrivacyNumber>
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}</div>
                {t.notes && <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.notes}</div>}
                <div className="flex gap-2">
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
              }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-500" aria-label="Edit Transaction">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z"/><path d="M5.25 19.5h13.5"/></svg>
                Edit
              </button>
              <button title="Delete" onClick={async()=>{ try { await api.transactions.remove(t.id); setItems(prev=> prev.filter(x=> x.id!==t.id)); setTotal(prev=> Math.max(0, prev-1)); } catch { /* ignore */ } }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600" aria-label="Delete Transaction">
>>>>>>> main
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
                Delete
              </button>
              {(t as any).recurringTransactionId && (
                <div className="col-span-2 flex items-center justify-center px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                  ⟳ Recurring transaction
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full text-sm">
          <tbody>
            {/* Debug: {console.log('Rendering items:', items.length, 'items')} */}
            {items.map((t)=> (
              <tr key={t.id} className="group border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20 relative">
                {selectionMode && (
                  <td className="p-2 w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelectItem(t.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td className="p-2 w-[25%] dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    {formatDateDMY(t.date)}
                    {(t as any).recurringTransactionId && (
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-yellow-600 dark:text-yellow-400 text-xs font-medium" title="Recurring transaction">
                        ⟳
                      </span>
                    )}
                  </div>
                </td>
                <td className={`p-2 w-[25%] font-semibold ${((t as any).type==='Income' || categoryMap[t.categoryId]?.type==='Income' || t.category?.type==='Income') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <PrivacyNumber value={t.amount}>
                    {formatEUR(t.amount)}
                  </PrivacyNumber>
                </td>
<<<<<<< HEAD
                <td className="p-2 min-w-[120px]">{t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}</td>
                <td className="p-2 min-w-[150px] hidden sm:table-cell">{t.notes}</td>
                <td className="p-2 min-w-[100px]">
                  <div className="flex flex-col sm:flex-row gap-1">
                    <button title="Edit" onClick={()=>{ setEditingId(t.id); setForm({ date: String(t.date).slice(0,10), amount: t.amount, accountId: t.accountId, categoryId: t.categoryId, notes: t.notes||'' }); setShowModal(true) }} className="p-1 sm:p-2 text-xs sm:text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" aria-label="Edit Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4"><path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z"/><path d="M5.25 19.5h13.5"/></svg>
                    </button>
                    <button title="Delete" onClick={async()=>{ try { await api.transactions.remove(t.id); setItems(prev=> prev.filter(x=> x.id!==t.id)); setTotal(prev=> Math.max(0, prev-1)); } catch { /* ignore */ } }} className="p-1 sm:p-2 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" aria-label="Delete Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
=======
                <td className="p-2 w-[25%] dark:text-gray-200">{t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}</td>
                <td className="p-2 w-[25%] hidden sm:table-cell dark:text-gray-300">{t.notes}</td>
                
                {/* Floating action buttons on hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded shadow-lg px-1 py-1">
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
                    }} className="p-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Edit Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16.862 3.487a1.75 1.75 0 012.475 2.475l-9.9 9.9a4.5 4.5 0 01-1.69 1.06l-3.042.97.97-3.043a4.5 4.5 0 011.06-1.69l9.9-9.9z"/><path d="M5.25 19.5h13.5"/></svg>
                    </button>
                    <button title="Delete" onClick={async()=>{ try { await api.transactions.remove(t.id); setItems(prev=> prev.filter(x=> x.id!==t.id)); setTotal(prev=> Math.max(0, prev-1)); } catch { /* ignore */ } }} className="p-1.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800" aria-label="Delete Transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 3a1 1 0 00-1 1v1H5a1 1 0 100 2h14a1 1 0 100-2h-3V4a1 1 0 00-1-1H9zm-2 6a1 1 0 011 1v8a1 1 0 102 0v-8a1 1 0 112 0v8a1 1 0 102 0v-8a1 1 0 112 0v8a3 3 0 01-3 3H10a3 3 0 01-3-3V10a1 1 0 011-1z"/></svg>
>>>>>>> main
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4">
          <form onSubmit={createTxn} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded p-4 w-full max-w-sm space-y-2 max-h-[90vh] overflow-y-auto">
            <div className="font-semibold mb-2 dark:text-gray-100">{editingId ? 'Edit Transaction' : 'Add Transaction'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">All fields are required except Notes.</div>
            <label className="text-sm font-medium dark:text-gray-200">Date</label>
            <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500" />
            <label className="text-sm font-medium dark:text-gray-200">Amount (e.g., 24.99)</label>
            <input type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} placeholder="Amount" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500" />
            {/* Type removed (inferred from category); Account removed as requested */}
            <label className="text-sm font-medium dark:text-gray-200">Category</label>
            <div className="relative">
              {/* Show selected category as badge */}
              {form.categoryId && categoryMap[form.categoryId] && (
                <div 
                  onClick={() => {
                    setCategoryQuery('');
                    setForm({...form, categoryId: ''});
                  }}
                  className={`mb-2 flex items-center justify-between w-full px-3 py-2 rounded-md cursor-pointer border ${
                    categoryMap[form.categoryId].type === 'Income' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700' 
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                  }`}
                >
                  <span className="font-medium">{categoryMap[form.categoryId].name}</span>
                  <span className="text-xs opacity-70">✕ Click to change</span>
                </div>
              )}
              
              {/* Search input - only show when no category selected */}
              {!form.categoryId && (
                <>
                  <input
                    placeholder="Search category..."
                    value={categoryQuery}
                    onChange={handleCategoryChange}
                    onKeyDown={handleCategoryKeyDown}
                    onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                    onFocus={() => categoryQuery.length >= 1 && categorySuggestions.length > 0 && setShowCategorySuggestions(true)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded"
                  />
                  {showCategorySuggestions && categorySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-b shadow-lg max-h-40 overflow-y-auto">
                      {categorySuggestions.map((c, index) => (
                        <div
                          key={c.id}
                          onClick={() => selectCategorySuggestion(c)}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                            index === selectedCategoryIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
                          } ${c.type==='Income'?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400'}`}
                        >
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Category list - only show when no category selected */}
            {!form.categoryId && (
              <div className="max-h-40 overflow-auto border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-750 rounded">
                {categories
                  .filter(c=> c.name.toLowerCase().includes(categoryQuery.toLowerCase()))
                  .map(c=> (
                    <div
                      key={c.id}
                      onClick={()=>{setForm({...form, categoryId: c.id}); setCategoryQuery(c.name)}}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${form.categoryId===c.id? 'bg-gray-100 dark:bg-gray-600':''} ${c.type==='Income'?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400'}`}
                    >
                      {c.name}
                    </div>
                  ))}
              </div>
            )}
            <label className="text-sm font-medium dark:text-gray-200">Notes</label>
            <div className="relative">
              {/* Notes suggestions ABOVE the input */}
              {showNotesSuggestions && notesSuggestions.length > 0 && (
                <div className="absolute bottom-full mb-1 z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-t shadow-lg max-h-40 overflow-y-auto">
                  {notesSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectSuggestion(suggestion)}
                      className={`px-3 py-2 cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                        index === selectedSuggestionIndex ? 'bg-blue-100 dark:bg-blue-900' : ''
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
                placeholder="Optional notes" 
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500" 
              />
            </div>
            
            {/* Recurring Transaction Section */}
            {!editingId && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm font-medium dark:text-gray-200 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.isRecurring} 
                    onChange={e => setForm({...form, isRecurring: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  Make this a recurring transaction
                </label>
                
                {form.isRecurring && (
                  <div className="mt-3 space-y-2 pl-6">
                    <label className="text-sm font-medium dark:text-gray-200">Frequency</label>
                    <select 
                      value={form.frequency} 
                      onChange={e => setForm({...form, frequency: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Every 2 weeks</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="BIMONTHLY">Every 2 months</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                    
                    <label className="text-sm font-medium dark:text-gray-200">End Date (Optional)</label>
                    <input 
                      type="date" 
                      value={form.endDate} 
                      onChange={e => setForm({...form, endDate: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Leave empty for no end date</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
<<<<<<< HEAD
              <button type="button" onClick={()=>{ 
                // Close modal and fully reset transient form state
                setShowModal(false); 
                setEditingId(null); 
                setShowNotesSuggestions(false); 
                setNotesSuggestions([]); 
                setSelectedSuggestionIndex(-1); 
                setShowCategorySuggestions(false); 
                setCategorySuggestions([]); 
                setSelectedCategoryIndex(-1);
                // Reset the form fields so the modal is clean next time
                setForm({ date: new Date().toISOString().slice(0,10), amount: 0, accountId: '', categoryId: '', notes: '' });
                setCategoryQuery('');
              }} className="px-3 py-2 rounded">Cancel</button>
              <button type="submit" disabled={!form.categoryId || !form.amount} className="px-3 py-2 rounded bg-blue-600 disabled:bg-blue-400 text-white">Save</button>
=======
              <button type="button" onClick={()=>{ setShowModal(false); setEditingId(null); setShowNotesSuggestions(false); setNotesSuggestions([]); setSelectedSuggestionIndex(-1); setShowCategorySuggestions(false); setCategorySuggestions([]); setSelectedCategoryIndex(-1) }} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
              <button type="submit" disabled={!form.categoryId || !form.amount} className="px-3 py-2 rounded bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white hover:bg-blue-700 disabled:cursor-not-allowed">Save</button>
>>>>>>> main
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Info Modal */}
      {showImportInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
            <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-600">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              CSV Import Format
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Your CSV file should contain transaction data with the following structure:
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">CSV Format:</h4>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-3 border border-gray-200 dark:border-gray-700">
                  <code className="text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded block font-mono text-gray-800 dark:text-gray-200">
                    date,amount,category,notes
                  </code>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">or using semicolon as delimiter:</p>
                  <code className="text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded block font-mono text-gray-800 dark:text-gray-200 mt-1">
                    date;amount;category;notes
                  </code>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">Field Details:</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex gap-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">date</span>
                    <span>Date in DD/MM/YYYY or YYYY-MM-DD format</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">amount</span>
                    <span>Transaction amount (use dot as decimal separator, e.g., 45.50)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">category</span>
                    <span>Category name (will be created if doesn't exist)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">notes</span>
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
                <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-200">Example CSV:</h4>
                <div className="bg-gray-900 dark:bg-gray-950 rounded p-3 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono">
{`date,amount,category,notes
25/10/2024,45.50,Groceries,Weekly shopping
26/10/2024,120.00,Utilities,Electric bill
27/10/2024,15.99,Entertainment,Netflix`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowImportInfo(false)}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowImportInfo(false)
                  fileInputRef.current?.click()
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Select CSV File
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
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleBulkUpdateCategory(cat.id)}
                  className="w-full text-left px-4 py-3 rounded border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{cat.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      cat.type === 'Income' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
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


