import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api, apiMultipart } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import { useAlert } from '../contexts/AlertContext'
import { TransactionModal } from '../components/TransactionModal'
import { TransactionFilters } from '../components/transactions/TransactionFilters'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { PrivacyNumber } from '../components/PrivacyNumber'
import { usePrivacy } from '../contexts/PrivacyContext'
import { formatEUR, formatDateDMY } from '../lib/format'

export function TransactionsPage() {
  const { showToast } = useToast()
  const { showAlert } = useAlert()
  const { hideNumbers } = usePrivacy()
  const [items, setItems] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number|null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialFetchStarted = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), amount: '', accountId: '', categoryId: '', notes: '', tags: [], isRecurring: false, frequency: 'MONTHLY', endDate: '' })
  
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const [categoryQuery, setCategoryQuery] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [sortBy, setSortBy] = useState<'date'|'amount'|'categoryId'|'notes'>('date')
  const [order, setOrder] = useState<'asc'|'desc'>('desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [monthlyNetByMonth, setMonthlyNetByMonth] = useState<Record<string, number>>({})
  
  // Undo/Redo for deletions
  const [deletionHistory, setDeletionHistory] = useState<{transaction: any, deletedAt: number}[]>([])
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showUndoNotice, setShowUndoNotice] = useState(false)
  
  // Filters State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [txnType, setTxnType] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [searchFocused, setSearchFocused] = useState(false)
  const [isAiMode, setIsAiMode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const pageSize = 25

  async function handleAiSearch() {
    if (!searchQuery.trim()) return
    setAiLoading(true)
    try {
      const res = await api.transactions.aiQuery(searchQuery)
      setItems(res.items)
      setTotal(res.items.length)
      showToast('AI Query Applied!', 'success')
      setIsAiMode(false)
    } catch (err) {
      showToast('AI failed to parse query', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        let handled = false
        if (selectedIds.size > 0 || selectionMode) {
          setSelectedIds(new Set())
          setSelectionMode(false)
          setShowCategoryModal(false)
          handled = true
        } else if (showCategoryModal) {
          setShowCategoryModal(false)
          handled = true
        }
        if (isFiltersOpen) {
          setIsFiltersOpen(false)
          handled = true
        }
        if (handled) {
          e.preventDefault()
          return
        }
      }

      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return

      if (e.key.toLowerCase() === 'a' && !showModal) {
        e.preventDefault()
        setShowModal(true)
      }
      if (e.key.toLowerCase() === 'e' && items.length > 0 && !showModal) {
        e.preventDefault()
        const lastTxn = items[0]
        setEditingId(lastTxn.id)
        setForm(lastTxn)
        setShowModal(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, items, selectedIds, selectionMode, showCategoryModal, isFiltersOpen])

  // Handle Ctrl+Z for undo deletion
  useEffect(() => {
    const handleUndoKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && deletionHistory.length > 0) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleUndoKeyPress)
    return () => window.removeEventListener('keydown', handleUndoKeyPress)
  }, [deletionHistory])

  const scrollToTop = () => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(scrollContainerRef.current ? scrollContainerRef.current.scrollTop > 400 : false)
    const container = scrollContainerRef.current
    if (container) container.addEventListener('scroll', handleScroll)
    return () => container?.removeEventListener('scroll', handleScroll)
  }, [])

  async function fetchPage(p: number, mode: 'replace'|'append' = 'replace') {
    if (loading) return
    setLoading(true)
    let query = `?page=${p}&limit=${pageSize}&sortBy=${sortBy}&order=${order}`
    if (startDate) query += `&startDate=${startDate}`
    if (endDate) query += `&endDate=${endDate}`
    if (selectedCategory) query += `&category=${encodeURIComponent(selectedCategory)}`
    if (txnType) query += `&type=${encodeURIComponent(txnType)}`
    if (searchQuery.trim()) query += `&search=${encodeURIComponent(searchQuery.trim())}`
    if (minAmount !== '') query += `&minAmount=${encodeURIComponent(minAmount)}`
    if (maxAmount !== '') query += `&maxAmount=${encodeURIComponent(maxAmount)}`
    
    try {
        const res: any = await api.transactions.list(query)
        let receivedItems = (res.items || []).filter((it: any) => it !== null && it !== undefined)
        
        if (txnType) receivedItems = receivedItems.filter((it: any) => it.type === txnType || it.category?.type === txnType)

        setTotal(res.total || 0)
        setMonthlyNetByMonth((res.monthlyNetByMonth || {}) as Record<string, number>)
        if (mode === 'replace') setItems(receivedItems)
        else setItems((prev: any[]) => {
            const existingIds = new Set(prev.filter(it => it).map((item: any) => item.id))
            return [...prev, ...receivedItems.filter((item: any) => !existingIds.has(item.id))]
        })
        setPage(p)
    } catch (err) {
        console.error('Fetch error:', err)
    } finally {
        setLoading(false)
    }
  }

  const refresh = useCallback(() => fetchPage(1, 'replace'), [sortBy, order, startDate, endDate, selectedCategory, searchQuery, txnType, minAmount, maxAmount])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params = { start: urlParams.get('startDate'), end: urlParams.get('endDate'), cat: urlParams.get('category'), type: urlParams.get('type') }
    if (params.start) setStartDate(params.start); if (params.end) setEndDate(params.end); if (params.cat) setSelectedCategory(params.cat); if (params.type) setTxnType(params.type);
    
    if (!initialFetchStarted.current) initialFetchStarted.current = true
    
    Promise.all([api.accounts.list(), api.categories.list()]).then(([accs, cats])=>{
      setCategories(cats as any[])
      if (!form.accountId && (accs as any[])[0]) setForm((f:any)=>({ ...f, accountId: (accs as any[])[0].id }))
      if (!form.categoryId && (cats as any[])[0]) setForm((f:any)=>({ ...f, categoryId: (cats as any[])[0].id }))
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setItems([]); fetchPage(1, 'replace') }, searchQuery ? 350 : 50)
    return () => clearTimeout(timer)
  }, [sortBy, order, startDate, endDate, selectedCategory, searchQuery, txnType, minAmount, maxAmount])

  useEffect(()=>{
    const container = scrollContainerRef.current
    if (!container) return
    const onScroll = () => {
      if (!container) return
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
      if (nearBottom && items.length < total && !loading) fetchPage(page + 1, 'append')
    }
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [items.length, total, loading, page])

  useEffect(() => {
      const lastWord = searchQuery.split(' ').pop() || ''
      if (lastWord.startsWith('#') && lastWord.length > 1) {
        api.transactions.getTags(lastWord.slice(1)).then((suggestions: string[]) => {
            setTagSuggestions(suggestions); setShowTagSuggestions(suggestions.length > 0)
        }).catch(console.error)
      } else setShowTagSuggestions(false)
  }, [searchQuery])

  const allSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const lastWord = searchQuery.split(' ').pop() || ''
    if (lastWord.startsWith('#') && lastWord.length > 1 && tagSuggestions.length > 0) return tagSuggestions.map(tag => ({ label: `#${tag}`, value: tag, kind: 'tag' as const, catType: '' }))
    const q = searchQuery.toLowerCase().trim()
    if (q.length < 2) return []
    const seenNotes = new Set<string>()
    const noteS = items.map((it: any) => (it.notes || '').trim()).filter((note: string) => note && note.toLowerCase().includes(q) && !seenNotes.has(note) && seenNotes.add(note)).slice(0, 5).map(note => ({ label: note, value: note, kind: 'note' as const, catType: '' }))
    const catS = categories.filter(c => c.name.toLowerCase().includes(q)).sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || a.name.localeCompare(b.name)).slice(0, 5).map(c => ({ label: c.name, value: c.name, kind: 'category' as const, catType: c.type as string }))
    return [...noteS, ...catS].slice(0, 8)
  }, [searchQuery, tagSuggestions, categories, items])

  const applySuggestion = useCallback((s: { value: string, label: string, kind: string }) => {
    if (s.kind === 'tag') {
      const words = searchQuery.split(' '); words[words.length - 1] = `#${s.value}`; setSearchQuery(words.join(' ') + ' ')
    } else if (s.kind === 'category') {
      setSearchQuery(`category:"${s.label}"`)
    } else {
      setSearchQuery(s.label)
    }
    setActiveSuggestion(-1); setSearchFocused(false); searchInputRef.current?.blur()
  }, [searchQuery])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allSuggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(prev => prev < allSuggestions.length - 1 ? prev + 1 : 0) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestion(prev => prev > 0 ? prev - 1 : allSuggestions.length - 1) }
    else if (e.key === 'Tab') { e.preventDefault(); applySuggestion(allSuggestions[activeSuggestion >= 0 ? activeSuggestion : 0]) }
    else if (e.key === 'Enter' && activeSuggestion >= 0) { e.preventDefault(); applySuggestion(allSuggestions[activeSuggestion]) }
    else if (e.key === 'Escape') { setActiveSuggestion(-1); setSearchFocused(false) }
  }

  async function ensureAccountId(): Promise<number> {
    if (form.accountId) return Number(form.accountId)
    const accounts = await api.accounts.list()
    if ((accounts as any[]).length > 0) {
      const id = (accounts as any[])[0].id; setForm((f:any)=>({ ...f, accountId: id })); return id
    }
    const created = await api.accounts.create({ name: 'Primary', initialBalance: 0 })
    setForm((f:any)=>({ ...f, accountId: (created as any).id })); return (created as any).id
  }

   async function createTxn(formData: any) {
    try {
      if (!formData.categoryId && (!formData.splits || formData.splits.length === 0)) { showToast('Please select a category.', 'warning'); return }
      formData.amount = String(formData.amount).replace(',', '.')
      const acctId = await ensureAccountId()
      
      if (formData.isRecurring) {
        const category = categories.find((c: any) => c.id === Number(formData.categoryId))
        const recurringTransaction = await api.recurringTransactions.create({ accountId: acctId, categoryId: formData.categoryId ? Number(formData.categoryId) : undefined, amount: Number(formData.amount), type: category?.type || 'Expense', notes: formData.notes, frequency: formData.frequency, startDate: formData.date, endDate: formData.endDate || undefined, assetItemId: formData.assetItemId ? Number(formData.assetItemId) : null })
        await api.transactions.create({ date: formData.date, amount: Number(formData.amount), accountId: acctId, categoryId: formData.categoryId ? Number(formData.categoryId) : undefined, notes: formData.notes, assetItemId: formData.assetItemId ? Number(formData.assetItemId) : null, recurringTransactionId: recurringTransaction.id })
      } else {
        const payload: any = { date: formData.date, amount: Number(formData.amount), accountId: acctId, categoryId: formData.categoryId ? Number(formData.categoryId) : undefined, notes: formData.notes, tags: formData.tags, assetItemId: formData.assetItemId ? Number(formData.assetItemId) : null, splits: formData.splits?.length > 0 ? formData.splits.map((s:any) => ({categoryId: Number(s.categoryId), amount: Number(s.amount), notes: s.notes || ''})) : undefined }
        if (formData.receipt) {
            const apiFormData = new FormData();
            Object.entries(payload).forEach(([k, v]) => { if (v !== undefined) { if (v === null) apiFormData.append(k, ''); else if (k === 'tags' || k === 'splits') apiFormData.append(k, JSON.stringify(v)); else apiFormData.append(k, String(v)); } });
            apiFormData.append('receipt', formData.receipt);
            if (editingId) await apiMultipart(`/api/transactions/${editingId}`, 'PUT', apiFormData);
            else await apiMultipart('/api/transactions', 'POST', apiFormData);
        } else {
            if (formData.deleteAttachment) payload.deleteAttachment = true;
            if (editingId) await api.transactions.update(editingId, payload); else await api.transactions.create(payload)
        }
      }
      refresh(); showToast('Transaction saved', 'success'); setShowModal(false); setEditingId(null); setForm({ date: new Date().toISOString().slice(0,10), amount: '', accountId: '', categoryId: '', notes: '', tags: [], isRecurring: false, frequency: 'MONTHLY', endDate: '' })
    } catch (err: any) {
      showToast(err?.message || 'Could not save transaction', 'error'); console.error('Create transaction error:', err)
    }
  }

  async function handleDeleteTransaction(id: number) {
      const txnToDelete = items.find(x => x.id === id); if (!txnToDelete) return
      setDeletionHistory(prev => [{transaction: txnToDelete, deletedAt: Date.now()}, ...prev].slice(0, 10)); setShowUndoNotice(true)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(async () => { try { await api.transactions.remove(id); setShowUndoNotice(false) } catch (err) { showToast('Error deleting transaction', 'error'); setShowUndoNotice(false) } }, 5000)
      setItems(prev => prev.filter(x => x.id !== id)); setTotal(prev => Math.max(0, prev - 1)); setShowModal(false); setEditingId(null)
  }
  
  function handleUndo() {
    if (deletionHistory.length === 0) return
    const lastDeleted = deletionHistory[0]; setDeletionHistory(prev => prev.slice(1))
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null }
    setItems(prev => [lastDeleted.transaction, ...prev]); setTotal(prev => prev + 1); setShowUndoNotice(false); showToast('Deletion undone!', 'success')
  }

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) setOrder(order === 'asc' ? 'desc' : 'asc'); else { setSortBy(column); setOrder('asc') }
  }

  function toggleSelectItem(id: number) {
    const newSelected = new Set(selectedIds); if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id)
    setSelectedIds(newSelected); setSelectionMode(newSelected.size > 0)
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    showAlert({ title: 'Delete Transactions', message: `Are you sure you want to delete ${selectedIds.size} transactions?`, confirmText: 'Delete', type: 'danger', onConfirm: async () => {
        try { await api.transactions.bulkDelete(Array.from(selectedIds)); setItems(prev => prev.filter(t => !selectedIds.has(t.id))); setTotal(prev => Math.max(0, prev - selectedIds.size)); setSelectedIds(new Set()); setSelectionMode(false); showToast('Transactions deleted', 'success') }
        catch { showToast('Failed to delete transactions', 'error') }
    }})
  }

  async function handleBulkUpdateCategory(categoryId: number) {
     if (selectedIds.size === 0) return
    try {
      await api.transactions.bulkUpdateCategory(Array.from(selectedIds), categoryId)
      setItems(prev => prev.map(t => {
        if (selectedIds.has(t.id)) { const category = categories.find(c => c.id === categoryId); return { ...t, categoryId, category, type: category?.type || t.type } }
        return t
      }))
      setSelectedIds(new Set()); setShowCategoryModal(false); setSelectionMode(false); showToast('Category updated', 'success');
    } catch { showToast('Error updating category', 'error') }
  }

  const categoryMap = useMemo(()=>{
    const m: Record<number, any> = {}; for (const c of categories) m[c.id] = c; return m
  }, [categories])

  const quickStats = useMemo(() => {
    const expenses = items.filter(it => it.type === 'Expense' || categoryMap[it.categoryId]?.type === 'Expense');
    if (expenses.length === 0) return null;
    let total = 0, min = Infinity, max = -Infinity;
    const catTotals: Record<number, { amount: number, color: string, name: string }> = {};
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    for (const item of expenses) {
      const amt = Number(item.amount) || 0; total += amt; if (amt < min) min = amt; if (amt > max) max = amt;
      const catId = item.categoryId; if (catId) {
        if (!catTotals[catId]) { const cat = categoryMap[catId]; catTotals[catId] = { amount: 0, name: cat ? cat.name : 'Unknown', color: cat?.color || colors[catId % colors.length] }; }
        catTotals[catId].amount += amt;
      }
    }
    const breakdown = Object.values(catTotals).sort((a,b) => b.amount - a.amount).map(b => ({ ...b, percent: total > 0 ? (b.amount / total) * 100 : 0 }));
    return { total, avg: total / expenses.length, min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max, breakdown };
  }, [items, categoryMap]);

  const activeFilterCount = [startDate, endDate, txnType, selectedCategory, minAmount, maxAmount].filter(v => String(v).trim() !== '').length

  const clearAllFiltersAndSearch = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setTxnType('');
    setMinAmount('');
    setMaxAmount('');
  };

  const isModalOpen = showModal || showCategoryModal;

  return (
    <div className={`relative flex h-[calc(100vh-52px)] flex-col bg-slate-50 dark:bg-[#070707] text-slate-900 dark:text-[#f0f0f0] animate-page-entry ${isModalOpen ? 'z-[60]' : ''}`}>
        
        {/* Sleek Workspace Header */}
        <div className="z-30 border-b border-slate-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0c0c0c] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-[1800px] flex-col gap-4 md:grid md:grid-cols-3 md:items-center">
            
            <div className="flex items-center gap-4 shrink-0 justify-self-start">
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">Registry</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{total} Entries</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-[#1f1f1f] mx-1 hidden sm:block" />
                <button
                    onClick={() => { setForm({ date: new Date().toISOString().slice(0,10), amount: '', accountId: (categories as any[])[0]?.id || '', categoryId: '', notes: '', tags: [], isRecurring: false, frequency: 'MONTHLY', endDate: '' }); setCategoryQuery(''); setEditingId(null); setShowModal(true); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 transition-all active:scale-95 shrink-0"
                    title="Add transaction"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                </button>
            </div>

            {/* Precision Search */}
            <div className="relative w-full group justify-self-center max-w-2xl">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isAiMode ? "Terminal Query Prompt..." : "Search data stream..."}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setActiveSuggestion(-1) }}
                onKeyDown={(e) => (e.key === 'Enter' && isAiMode) ? handleAiSearch() : handleSearchKeyDown(e)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`w-full bg-slate-50 dark:bg-[#111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg py-2 pl-10 pr-24 text-xs font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-blue-500/50 focus:bg-white dark:focus:bg-[#0d0d0d] focus:ring-4 focus:ring-blue-500/5 ${isAiMode ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/5' : ''}`}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setActiveSuggestion(-1); }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Clear search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => { setIsAiMode(!isAiMode); if(!isAiMode) setSearchQuery('') }}
                  className={`flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-bold uppercase transition-all ${isAiMode ? 'bg-indigo-600 text-white' : 'bg-slate-200/50 dark:bg-[#1a1a1a] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {aiLoading ? <div className="h-2 w-2 animate-spin rounded-full border border-white border-t-transparent" /> : <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9H22L16 14L18.5 21L12 17L5.5 21L8 14L2 9H9.5L12 2Z"/></svg>}
                  {isAiMode ? 'Processing' : 'AI'}
                </button>
              </div>

              {searchFocused && allSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#0d0d0d] py-1 shadow-2xl">
                  {allSuggestions.map((s, i) => (
                    <button key={i} onMouseDown={(e) => { e.preventDefault(); applySuggestion(s) }} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${i === activeSuggestion ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#151515] hover:text-slate-900 dark:hover:text-slate-200'}`}>
                      {s.kind === 'tag' ? <span className="text-blue-500">#</span> : s.kind === 'note' ? <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> : <span className={`h-1.5 w-1.5 rounded-full ${s.catType === 'Income' ? 'bg-emerald-400' : s.catType === 'Transfer' ? 'bg-blue-400' : 'bg-rose-400'}`} />}
                      <span className="flex-1 truncate">{s.label}</span>
                      <span className="text-[9px] opacity-40 uppercase font-bold">{s.kind}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-self-end">
              <button
                onClick={() => setIsFiltersOpen(true)}
                className={`w-8 h-8 flex items-center justify-center relative rounded-lg border transition-all ${activeFilterCount > 0 ? 'border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111] text-slate-500 hover:border-slate-300 dark:hover:border-[#2a2a2a] hover:text-slate-700 dark:hover:text-slate-300'} active:scale-95`}
                title="Filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-[#0c0c0c] animate-in zoom-in-50 duration-200">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {(activeFilterCount > 0 || searchQuery.trim() !== '') && (
                <button
                  onClick={clearAllFiltersAndSearch}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-rose-200 dark:border-rose-950/30 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:border-rose-300 dark:hover:border-rose-800 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-200 shrink-0"
                  title="Reset all filters & search query"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Stats Strip */}
        {quickStats && (activeFilterCount > 0 || searchQuery) && (
            <div className="z-20 bg-slate-50 dark:bg-[#070707] border-b border-slate-200 dark:border-[#1a1a1a] px-4 py-2 sm:px-6">
                <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-x-8 gap-y-4">
                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar shrink-0">
                        <div><p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Aggregated Net</p><p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums"><PrivacyNumber value={quickStats.total}>{formatEUR(quickStats.total)}</PrivacyNumber></p></div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-[#1a1a1a]" />
                        <div><p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Avg Unit</p><p className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums"><PrivacyNumber value={quickStats.avg}>{formatEUR(quickStats.avg)}</PrivacyNumber></p></div>
                        <div className="hidden sm:block"><p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Spectrum</p><p className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">{formatEUR(quickStats.min)} <span className="text-slate-300 dark:text-slate-700 mx-1">/</span> {formatEUR(quickStats.max)}</p></div>
                    </div>
                    <div className="flex flex-1 items-center gap-4 max-w-md ml-auto min-w-[200px]">
                        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-[#111]">
                            {quickStats.breakdown.map((cat) => (
                                <div key={cat.name} className="h-full transition-all" style={{ width: `${Math.max(0.5, cat.percent)}%`, backgroundColor: cat.color }} title={`${cat.name}: ${cat.percent.toFixed(1)}%`} />
                            ))}
                        </div>
                        <div className="flex -space-x-1">
                            {quickStats.breakdown.slice(0, 3).map(cat => <div key={cat.name} className="h-2 w-2 rounded-full border border-white dark:border-[#070707]" style={{ backgroundColor: cat.color }} />)}
                        </div>
                    </div>
                </div>
            </div>
        )}


        {/* High-Tech Data Grid Area */}
        <div className="relative flex flex-1 overflow-hidden">
            <TransactionFilters
                isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)}
                startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} txnType={txnType} setTxnType={setTxnType} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} minAmount={minAmount} setMinAmount={setMinAmount} maxAmount={maxAmount} setMaxAmount={setMaxAmount}
                categories={categories} onClearFilters={() => { setStartDate(''); setEndDate(''); setSelectedCategory(''); setTxnType(''); setMinAmount(''); setMaxAmount(''); }}
                minAmountValue={minAmount !== '' ? Number(minAmount) : 0} maxAmountValue={maxAmount !== '' ? Number(maxAmount) : Number(items[0]?.amount || 1000)} amountMinLimit={0} amountMaxLimit={5000}
            />

            <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
                <div className="mx-auto h-full w-full max-w-[1800px] rounded-xl border border-slate-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0c0c0c] shadow-2xl overflow-hidden flex flex-col">
                   <TransactionTable
                       items={items} monthlyNetByMonth={monthlyNetByMonth} sortBy={sortBy} order={order} toggleSort={toggleSort}
                       selectionMode={selectionMode} selectedIds={selectedIds} toggleSelectItem={toggleSelectItem} categoryMap={categoryMap}
                       setEditingId={setEditingId} setForm={setForm} setCategoryQuery={setCategoryQuery} setShowModal={setShowModal}
                       setItems={setItems} setTotal={setTotal} loading={loading} total={total} scrollRef={scrollContainerRef}
                   />
                </div>
            </div>
        </div>

        {/* Overlays */}
        {selectionMode && (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-2 bg-slate-900 dark:bg-[#111] text-white border border-slate-700 dark:border-[#222] rounded-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <span className="text-xs font-bold uppercase tracking-wider border-r border-slate-700 dark:border-[#222] pr-4">{selectedIds.size} selected</span>
                
                {/* Relocate Button */}
                <button 
                  onClick={() => setShowCategoryModal(true)} 
                  className="p-2 text-slate-300 hover:text-blue-400 rounded-lg hover:bg-slate-800/50 transition-colors"
                  title="Change Category"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.5 1.5 0 002.122 0l4.318-4.318a1.5 1.5 0 000-2.122L11.159 3.659A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                </button>
                
                {/* Delete Button */}
                <button 
                  onClick={handleBulkDelete} 
                  className="p-2 text-rose-500 hover:text-rose-400 rounded-lg hover:bg-slate-800/50 transition-colors"
                  title="Delete Selected"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
                
                {/* Cancel Button */}
                <button 
                  onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }} 
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
                  title="Clear selection"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
         )}

        {showUndoNotice && (
             <div className="fixed bottom-10 right-10 z-50 flex items-center gap-4 px-6 py-4 bg-orange-600/90 backdrop-blur text-white rounded-2xl shadow-2xl animate-in slide-in-from-right-4 duration-300">
               <div className="flex flex-col"><p className="text-xs font-bold uppercase tracking-widest">Entry Removed</p><p className="text-[10px] opacity-80">Syncing to cloud in 5s...</p></div>
               <button onClick={handleUndo} className="px-4 py-2 bg-white text-orange-600 rounded-lg text-xs font-bold shadow-lg active:scale-95 transition-all">Restore System</button>
             </div>
        )}

        <TransactionModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingId(null) }} onSave={createTxn} onDelete={handleDeleteTransaction} editingId={editingId} initialData={form} categories={categories} />
        {showCategoryModal && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#111111] border border-slate-100 dark:border-[#1f1f1f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1f1f1f] flex justify-between items-center bg-white dark:bg-[#111111]">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-[#f0f0f0]">
                      Relocate Category
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">Select a new category for the selected transactions</p>
                  </div>
                  <button 
                    onClick={() => setShowCategoryModal(false)} 
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#666] dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242424] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-5 hide-scrollbar">
                   {['Expense', 'Income', 'Transfer'].map(type => {
                     const cats = categories.filter(c => c.type === type).sort((a,b)=>a.name.localeCompare(b.name));
                     if (cats.length === 0) return null;
                     return (
                       <div key={type} className="space-y-1.5">
                         <div className="text-xs font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider mb-2">{type}</div>
                         <div className="grid grid-cols-2 gap-2">
                           {cats.map(cat => (
                             <button 
                               key={cat.id} 
                               onClick={()=>handleBulkUpdateCategory(cat.id)} 
                               className="px-4 py-3 rounded-xl border border-slate-100 dark:border-[#1f1f1f] bg-slate-50 dark:bg-[#111111] hover:bg-slate-100 dark:hover:bg-[#1a1a1a] flex items-center justify-between group transition-colors text-sm font-semibold text-slate-700 dark:text-[#d8d8d8]"
                             >
                               <span className="truncate">{cat.name}</span>
                               <div className={`w-2 h-2 rounded-full shrink-0 ${cat.type==='Income'?'bg-emerald-500':cat.type==='Transfer'?'bg-blue-500':'bg-rose-500'}`} />
                             </button>
                           ))}
                         </div>
                       </div>
                     )
                   })}
                </div>
              </div>
            </div>,
            document.body
        )}
    </div>
  )
}
