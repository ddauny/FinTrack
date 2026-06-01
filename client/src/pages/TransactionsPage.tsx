import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { api, apiMultipart } from '../lib/api'
import { useToast } from '../contexts/ToastContext'
import { useAlert } from '../contexts/AlertContext'
import { TransactionModal } from '../components/TransactionModal'
import { TransactionFilters } from '../components/transactions/TransactionFilters'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { PrivacyNumber } from '../components/PrivacyNumber'
import { usePrivacy } from '../contexts/PrivacyContext'

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
  const initialLoadDone = useRef(false)
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

  const pageSize = 20

  // Keyboard shortcuts: Press 'A' to add new transaction, 'E' to edit last
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return
      }

      if (e.key.toLowerCase() === 'a' && !showModal) {
        e.preventDefault()
        setShowModal(true)
      }
      
      // Press 'E' to edit last transaction
      if (e.key.toLowerCase() === 'e' && items.length > 0 && !showModal) {
        e.preventDefault()
        const lastTxn = items[0] // First item (most recent if sorted desc by date)
        setEditingId(lastTxn.id)
        setForm(lastTxn)
        setShowModal(true)
        showToast('Editing last transaction (press A for new)', 'info')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, items])

  // Handle Ctrl+Z for undo deletion
  useEffect(() => {
    const handleUndoKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && deletionHistory.length > 0) {
        e.preventDefault()
        // Call handleUndo function defined below
        if (deletionHistory.length === 0) return
        
        const lastDeleted = deletionHistory[0]
        setDeletionHistory(prev => prev.slice(1))
        
        // Clear the auto-delete timer
        if (undoTimerRef.current) {
          clearTimeout(undoTimerRef.current)
          undoTimerRef.current = null
        }
        
        // Add back to items
        setItems(prev => [lastDeleted.transaction, ...prev])
        setTotal(prev => prev + 1)
        setShowUndoNotice(false)
        
        showToast('Deletion undone!', 'success')
      }
    }

    window.addEventListener('keydown', handleUndoKeyPress)
    return () => window.removeEventListener('keydown', handleUndoKeyPress)
  }, [deletionHistory])

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle Scroll To Top visibility
  useEffect(() => {
    const handleScroll = () => {
      const containerScroll = scrollContainerRef.current ? scrollContainerRef.current.scrollTop > 400 : false
      setShowScrollTop(containerScroll)
    }
    const container = scrollContainerRef.current
    if (container) container.addEventListener('scroll', handleScroll)
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Basic Fetching Logic
  async function fetchPage(p: number, mode: 'replace'|'append' = 'replace') {
    if (loading) return
    setLoading(true)
    let query = `?page=${p}&limit=${pageSize}&sortBy=${sortBy}&order=${order}`

    // Use current state filters
    if (startDate) query += `&startDate=${startDate}`
    if (endDate) query += `&endDate=${endDate}`
    if (selectedCategory) query += `&category=${encodeURIComponent(selectedCategory)}`
    if (txnType) query += `&type=${encodeURIComponent(txnType)}`
    if (searchQuery.trim()) query += `&search=${encodeURIComponent(searchQuery.trim())}`
    if (minAmount !== '') query += `&minAmount=${encodeURIComponent(minAmount)}`
    if (maxAmount !== '') query += `&maxAmount=${encodeURIComponent(maxAmount)}`
    
    try {
        const res: any = await api.transactions.list(query)
        
        let receivedItems = res.items || []
        // Client-side type filtering backup
        if (txnType) {
            receivedItems = receivedItems.filter((it: any) => {
                if (!it) return false
                if (it.type === txnType) return true
                if (it.category?.type === txnType) return true
                return false
            })
        }

        setTotal(res.total || 0)
        setMonthlyNetByMonth((res.monthlyNetByMonth || {}) as Record<string, number>)
        if (mode === 'replace') {
            setItems(receivedItems)
        } else {
            setItems((prev: any[]) => {
                const existingIds = new Set(prev.map((item: any) => item.id))
                const newItems = (receivedItems || []).filter((item: any) => !existingIds.has(item.id))
                return [...prev, ...newItems]
            })
        }
        setPage(p)
    } catch (err) {
        console.error('Fetch error:', err)
    } finally {
        setLoading(false)
    }
  }

  const refresh = useCallback(() => fetchPage(1, 'replace'), [sortBy, order, startDate, endDate, selectedCategory, searchQuery, txnType, minAmount, maxAmount])

  // Initial Load & URL Params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStartDate = urlParams.get('startDate');
    const urlEndDate = urlParams.get('endDate');
    const urlCategory = urlParams.get('category');
    const urlType = urlParams.get('type');

    if (urlStartDate) setStartDate(urlStartDate);
    if (urlEndDate) setEndDate(urlEndDate);
    if (urlCategory) setSelectedCategory(urlCategory);
    if (urlType) setTxnType(urlType);

    // Initial fetch logic handled by subsequent effect on filters change or manual call below
    if (!initialFetchStarted.current) {
        initialFetchStarted.current = true
        // If we have URL params, we might want to wait for state to update, but usually pure React state update is fast enough before effect fires?
        // Actually, we can just call fetchPage(1) here with the values we just read, but fetchPage reads from STATE.
        // State updates are async. usage of refs or passing args is better for initial.
        // To keep it simple: we set state, and use a separate effect that watches state changes to trigger fetch.
        // BUT we need to prevent double fetch on mount.
    }
    
    // Load metdata
    Promise.all([api.accounts.list(), api.categories.list()]).then(([accs, cats])=>{
      setCategories(cats as any[])
      if (!form.accountId && (accs as any[])[0]) setForm((f:any)=>({ ...f, accountId: (accs as any[])[0].id }))
      if (!form.categoryId && (cats as any[])[0]) setForm((f:any)=>({ ...f, categoryId: (cats as any[])[0].id }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch on filter/sort change
  useEffect(() => {
    // Debounce to avoid rapid re-fetches while typing
    const timer = setTimeout(() => {
        setPage(1)
        setItems([]) 
        fetchPage(1, 'replace')
    }, searchQuery ? 350 : 50)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, order, startDate, endDate, selectedCategory, searchQuery, txnType, minAmount, maxAmount])

  // Infinite Scroll
  useEffect(()=>{
    const container = scrollContainerRef.current
    if (!container) return

    function onScroll() {
      // Logic for infinite scroll
      if (!container) return
      
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
      const hasMore = items.length < total
      if (nearBottom && hasMore && !loading) {
          fetchPage(page + 1, 'append')
      }
    }
    
    container.addEventListener('scroll', onScroll)
    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  }, [items.length, total, loading, page])


  // Tag Suggestions Logic
  useEffect(() => {
      const words = searchQuery.split(' ')
      const lastWord = words[words.length - 1]
      
      if (lastWord.startsWith('#') && lastWord.length > 1) {
        const query = lastWord.slice(1)
        api.transactions.getTags(query)
          .then((suggestions: string[]) => {
            setTagSuggestions(suggestions)
            setShowTagSuggestions(suggestions.length > 0)
          })
          .catch(console.error)
      } else {
        setShowTagSuggestions(false)
      }
  }, [searchQuery])

  const selectTagSuggestion = useCallback((tag: string) => {
    const words = searchQuery.split(' ')
    words.pop()
    words.push(`#${tag}`)
    setSearchQuery(words.join(' ') + ' ')
    setShowTagSuggestions(false)
  }, [searchQuery])

  // Unified suggestions: notes + categories + #tags
  const allSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const words = searchQuery.split(' ')
    const lastWord = words[words.length - 1]
    // Tag completions when last word starts with #
    if (lastWord.startsWith('#') && lastWord.length > 1 && tagSuggestions.length > 0) {
      return tagSuggestions.map(tag => ({ label: `#${tag}`, value: tag, kind: 'tag' as const, catType: '' }))
    }
    const q = searchQuery.toLowerCase().trim()
    if (q.length < 2) return []
    // Note suggestions from loaded transactions
    const seenNotes = new Set<string>()
    const noteSuggestions = items
      .map((it: any) => (it.notes || '').trim())
      .filter((note: string) => note && note.toLowerCase().includes(q) && !seenNotes.has(note) && seenNotes.add(note))
      .slice(0, 5)
      .map(note => ({ label: note, value: note, kind: 'note' as const, catType: '' }))
    // Category name suggestions
    const categorySuggestions = categories
      .filter(c => c.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aS = a.name.toLowerCase().startsWith(q) ? 0 : 1
        const bS = b.name.toLowerCase().startsWith(q) ? 0 : 1
        return aS - bS || a.name.localeCompare(b.name)
      })
      .slice(0, 5)
      .map(c => ({ label: c.name, value: c.name, kind: 'category' as const, catType: c.type as string }))
    return [...noteSuggestions, ...categorySuggestions].slice(0, 8)
  }, [searchQuery, tagSuggestions, categories, items])

  const applySuggestion = useCallback((s: { value: string, label: string, kind: string }) => {
    if (s.kind === 'tag') {
      const words = searchQuery.split(' ')
      words[words.length - 1] = `#${s.value}`
      setSearchQuery(words.join(' ') + ' ')
    } else {
      setSearchQuery(s.label)
    }
    setActiveSuggestion(-1)
    setSearchFocused(false)
    searchInputRef.current?.blur()
  }, [searchQuery])

  // Search input keydown handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(prev => prev < allSuggestions.length - 1 ? prev + 1 : 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(prev => prev > 0 ? prev - 1 : allSuggestions.length - 1)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      applySuggestion(allSuggestions[activeSuggestion >= 0 ? activeSuggestion : 0])
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      applySuggestion(allSuggestions[activeSuggestion])
    } else if (e.key === 'Escape') {
      setActiveSuggestion(-1)
      setSearchFocused(false)
    }
  }

  // Modal & Actions Logic
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

   async function createTxn(formData: any) {
    try {
      if (!formData.categoryId && (!formData.splits || formData.splits.length === 0)) { showToast('Please select a category.', 'warning'); return }
      
      // Autocorrect amount: replace comma with dot
      formData.amount = String(formData.amount).replace(',', '.')
      
      const acctId = await ensureAccountId()
      
      if (formData.isRecurring) {
        const category = categories.find((c: any) => c.id === Number(formData.categoryId))
        const recurringPayload = {
          accountId: acctId,
          categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
          amount: Number(formData.amount),
          type: category?.type || 'Expense',
          notes: formData.notes,
          frequency: formData.frequency,
          startDate: formData.date,
          endDate: formData.endDate || undefined,
          assetItemId: formData.assetItemId ? Number(formData.assetItemId) : null
        }
        const recurringTransaction = await api.recurringTransactions.create(recurringPayload)
        const firstTransactionPayload = {
          date: formData.date,
          amount: Number(formData.amount),
          accountId: acctId,
          categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
          notes: formData.notes,
          assetItemId: formData.assetItemId ? Number(formData.assetItemId) : null,
          recurringTransactionId: recurringTransaction.id
        }
        await api.transactions.create(firstTransactionPayload)
        refresh()
      } else {
        const payload: any = { 
          date: formData.date,
          amount: Number(formData.amount),
          accountId: acctId,
          categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
          notes: formData.notes,
          tags: formData.tags,
          assetItemId: formData.assetItemId ? Number(formData.assetItemId) : null,
          splits: formData.splits?.length > 0 ? formData.splits.map((s:any) => ({categoryId: Number(s.categoryId), amount: Number(s.amount), notes: s.notes || ''})) : undefined
        }
        
        let savedTransaction: any;

        if (formData.receipt) {
            const apiFormData = new FormData();
            Object.entries(payload).forEach(([k, v]) => {
                if (v !== undefined) {
                  if (v === null) {
                    // Send empty string or 'null' depending on backend. We'll send empty string so backend parses as null
                    apiFormData.append(k, '');
                  } else if (k === 'tags' || k === 'splits') {
                    apiFormData.append(k, JSON.stringify(v));
                  } else {
                    apiFormData.append(k, String(v));
                  }
                }
            });
            apiFormData.append('receipt', formData.receipt);
            
            if (editingId) {
                savedTransaction = await apiMultipart(`/api/transactions/${editingId}`, 'PUT', apiFormData);
            } else {
                savedTransaction = await apiMultipart('/api/transactions', 'POST', apiFormData);
            }
        } else {
            if (formData.deleteAttachment) payload.deleteAttachment = true;
            if (editingId) savedTransaction = await api.transactions.update(editingId, payload)
            else savedTransaction = await api.transactions.create(payload)
        }

        refresh();
      }
      
      showToast('Transaction saved', 'success');
      setShowModal(false)
      setEditingId(null)
      setForm({ date: new Date().toISOString().slice(0,10), amount: '', accountId: '', categoryId: '', notes: '', tags: [], isRecurring: false, frequency: 'MONTHLY', endDate: '' })
    } catch (err: any) {
      const message = err?.message || 'Could not save transaction'
      showToast(message, 'error')
      console.error('Create transaction error:', err)
    }
  }

  async function handleDeleteTransaction(id: number) {
      try {
        const txnToDelete = items.find(x => x.id === id)
        if (!txnToDelete) return
        
        // Add to deletion history for undo
        setDeletionHistory(prev => [{transaction: txnToDelete, deletedAt: Date.now()}, ...prev].slice(0, 10))
        
        // Show undo notice
        setShowUndoNotice(true)
        
        // Clear previous timer
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        
        // Set timer for auto-delete after 5 seconds
        const timer = setTimeout(async () => {
          try {
            await api.transactions.remove(id)
            setShowUndoNotice(false)
          } catch (err) {
            showToast('Error deleting transaction', 'error')
            setShowUndoNotice(false)
          }
        }, 5000)
        undoTimerRef.current = timer
        
        // Remove from UI immediately
        setItems(prev => prev.filter(x => x.id !== id))
        setTotal(prev => Math.max(0, prev - 1))
        
        showToast('Transaction will be deleted in 5 seconds... (press Ctrl+Z to undo)', 'warning')
        setShowModal(false)
        setEditingId(null)
      } catch {
        showToast('Error deleting transaction', 'error')
      }
  }
  
  function handleUndo() {
    if (deletionHistory.length === 0) return
    
    const lastDeleted = deletionHistory[0]
    setDeletionHistory(prev => prev.slice(1))
    
    // Clear the auto-delete timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    
    // Add back to items
    setItems(prev => [lastDeleted.transaction, ...prev])
    setTotal(prev => prev + 1)
    setShowUndoNotice(false)
    
    showToast('Deletion undone!', 'success')
  }

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) setOrder(order === 'asc' ? 'desc' : 'asc')
    else { setSortBy(column); setOrder('asc') }
  }

  // Bulk Selection
  function toggleSelectItem(id: number) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    
    if (newSelected.size > 0 && !selectionMode) {
      setSelectionMode(true)
    } else if (newSelected.size === 0 && selectionMode) {
      setSelectionMode(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    showAlert({
      title: 'Delete Transactions',
      message: `Are you sure you want to delete ${selectedIds.size} transactions?`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.transactions.bulkDelete(Array.from(selectedIds))
          setItems(prev => prev.filter(t => !selectedIds.has(t.id)))
          setTotal(prev => Math.max(0, prev - selectedIds.size))
          setSelectedIds(new Set())
          setSelectionMode(false)
          showToast('Transactions deleted', 'success');
        } catch (error) {
          showToast('Failed to delete transactions', 'error')
        }
      }
    })
  }

  async function handleBulkUpdateCategory(categoryId: number) {
     if (selectedIds.size === 0) return
    try {
      await api.transactions.bulkUpdateCategory(Array.from(selectedIds), categoryId)
      // Update locally
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
      showToast('Category updated', 'success');
    } catch {
      showToast('Error updating category', 'error')
    }
  }

  const categoryMap = useMemo(()=>{
    const m: Record<number, any> = {}
    for (const c of categories) m[c.id] = c
    return m
  }, [categories])

  // Helpers for Amounts in Filters
  const amountMinLimit = 0
  const minAmountRaw = minAmount !== '' ? Number(minAmount) : undefined
  const maxAmountRaw = maxAmount !== '' ? Number(maxAmount) : undefined
  const amountMaxLimit = useMemo(() => {
    // Only calculate from current View if you want, or fix a max
    const maxItem = (items || []).reduce((acc: number, it: any) => {
      const value = Number(it?.amount || 0)
      return Number.isFinite(value) ? Math.max(acc, value) : acc
    }, 0)
    const rounded = Math.ceil(maxItem / 50) * 50
    const fromInputs = Math.max(minAmountRaw ?? 0, maxAmountRaw ?? 0)
    return Math.max(200, rounded, fromInputs)
  }, [items, minAmountRaw, maxAmountRaw])

  const quickStats = useMemo(() => {
    const expenses = items.filter(it => it.type === 'Expense' || categoryMap[it.categoryId]?.type === 'Expense');
    if (expenses.length === 0) return null;
    let total = 0;
    let min = Infinity;
    let max = -Infinity;
    
    // For Category breakdown progress bar calculation
    const catTotals: Record<number, { amount: number, color: string, name: string }> = {};
    const fallbackColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];

    for (const item of expenses) {
      const amt = Number(item.amount) || 0;
      total += amt;
      if (amt < min) min = amt;
      if (amt > max) max = amt;

      const catId = item.categoryId;
      if (catId) {
        if (!catTotals[catId]) {
          const cat = categoryMap[catId];
          const hashIdx = catId % fallbackColors.length;
          catTotals[catId] = {
            amount: 0,
            name: cat ? cat.name : 'Unknown',
            color: cat?.color || fallbackColors[hashIdx]
          };
        }
        catTotals[catId].amount += amt;
      }
    }

    const breakdown = Object.values(catTotals)
      .sort((a,b) => b.amount - a.amount)
      .map(b => ({ ...b, percent: total > 0 ? (b.amount / total) * 100 : 0 }));

    return {
      total,
      avg: total / expenses.length,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      breakdown
    };
  }, [items, categoryMap]);

  const activeFilterCount = [startDate, endDate, txnType, selectedCategory, minAmount, maxAmount]
    .filter(v => String(v).trim() !== '').length
  const hasScopedView = activeFilterCount > 0 || searchQuery.trim().length > 0

  return (
    <div className="relative flex h-[calc(100vh-52px)] flex-col overflow-hidden bg-slate-100 dark:bg-[#0b0b0b]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-100/65 via-blue-50/30 to-transparent dark:from-blue-900/15 dark:via-blue-900/5 dark:to-transparent"
        />

        {/* Page Header */}
        <div className="relative z-20 flex-shrink-0 px-2 pb-2 pt-2 sm:px-4">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-xl dark:border-[#252525] dark:bg-[#111111]/90">
            <div className="hidden min-w-[170px] flex-col md:flex">
              <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[#f0f0f0]">Transactions</h1>
              <p className="text-[11px] text-slate-500 dark:text-[#777]">{total} records</p>
            </div>

            {/* Search bar */}
            <div className="relative min-w-0 flex-1">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#555]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search transactions, notes, #tags"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setActiveSuggestion(-1) }}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-[#2b2b2b] dark:bg-[#171717] dark:text-[#e8e8e8] dark:placeholder:text-[#555] dark:focus:bg-[#131313]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-[#666] dark:hover:bg-[#202020] dark:hover:text-[#d8d8d8]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Autocomplete suggestions dropdown */}
              {searchFocused && allSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 dark:border-[#282828] dark:bg-[#151515] dark:shadow-black/30">
                  {allSuggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion(s) }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                        i === activeSuggestion
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-[#d8d8d8] dark:hover:bg-[#1e1e1e]'
                      }`}
                    >
                      {s.kind === 'tag' ? (
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-xs font-bold text-blue-400">#</span>
                      ) : s.kind === 'note' ? (
                        <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      ) : (
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${
                          s.catType === 'Income' ? 'bg-emerald-400'
                          : s.catType === 'Transfer' ? 'bg-blue-400'
                          : 'bg-rose-400'
                        }`} />
                      )}
                      <span className="flex-1 truncate">{s.label}</span>
                      <span className="ml-auto flex-shrink-0 pl-2 text-xs text-slate-400 dark:text-[#555]">
                        {s.kind === 'tag' ? 'tag' : s.kind === 'note' ? 'note' : 'category'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => setIsFiltersOpen(true)}
                title="Open filters"
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeFilterCount > 0
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/25 hover:bg-blue-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#2b2b2b] dark:text-[#bbb] dark:hover:bg-[#1a1a1a]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">{activeFilterCount}</span>
                )}
              </button>

              <button
                onClick={() => {
                  setForm({ date: new Date().toISOString().slice(0,10), amount: '', accountId: form.accountId || '', categoryId: '', notes: '', tags: [], isRecurring: false, frequency: 'MONTHLY', endDate: '' });
                  setCategoryQuery('');
                  setEditingId(null);
                  setShowModal(true);
                }}
                title="Add new transaction (press A)"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex flex-1 overflow-hidden">
            <TransactionFilters
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                txnType={txnType}
                setTxnType={setTxnType}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                minAmount={minAmount}
                setMinAmount={setMinAmount}
                maxAmount={maxAmount}
                setMaxAmount={setMaxAmount}
                categories={categories}
                onClearFilters={() => {
                  setStartDate(''); setEndDate(''); setSelectedCategory('');
                  setTxnType(''); setMinAmount(''); setMaxAmount('');
                }}
                minAmountValue={minAmountRaw ?? amountMinLimit}
                maxAmountValue={maxAmountRaw ?? amountMaxLimit}
                amountMinLimit={amountMinLimit}
                amountMaxLimit={amountMaxLimit}
            />

            {/* Table Area */}
            <div className="relative z-0 flex flex-1 flex-col overflow-hidden">
              <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col px-2 pb-2 sm:px-4">
                {quickStats && hasScopedView && (
                  <div className="mb-2 flex-shrink-0 rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur dark:border-[#242424] dark:bg-[#111111]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-[#777]">Filtered Expense Overview</p>
                        <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-[#f0f0f0]">
                          <PrivacyNumber value={quickStats.total}>EUR {quickStats.total.toFixed(2)}</PrivacyNumber>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-right text-xs sm:min-w-[290px]">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-[#2a2a2a] dark:bg-[#181818]">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-[#666]">Avg</p>
                          <p className="font-semibold text-slate-700 dark:text-[#d6d6d6]">
                            <PrivacyNumber value={quickStats.avg}>EUR {quickStats.avg.toFixed(2)}</PrivacyNumber>
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-[#2a2a2a] dark:bg-[#181818]">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-[#666]">Min</p>
                          <p className="font-semibold text-slate-700 dark:text-[#d6d6d6]">
                            <PrivacyNumber value={quickStats.min}>EUR {quickStats.min.toFixed(2)}</PrivacyNumber>
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-[#2a2a2a] dark:bg-[#181818]">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-[#666]">Max</p>
                          <p className="font-semibold text-slate-700 dark:text-[#d6d6d6]">
                            <PrivacyNumber value={quickStats.max}>EUR {quickStats.max.toFixed(2)}</PrivacyNumber>
                          </p>
                        </div>
                      </div>
                    </div>

                    {quickStats.breakdown && quickStats.breakdown.length > 0 && (
                      <div className="mt-3">
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#202020]">
                          {quickStats.breakdown.map((cat) => (
                            <div
                              key={cat.name}
                              className="h-full transition-all duration-500 hover:opacity-85"
                              style={{ width: `${Math.max(0.5, cat.percent)}%`, backgroundColor: cat.color }}
                              title={hideNumbers ? cat.name : `${cat.name}: EUR ${cat.amount.toFixed(2)} (${cat.percent.toFixed(1)}%)`}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex gap-3 overflow-x-auto text-[11px] text-slate-600 dark:text-[#888]">
                          {quickStats.breakdown.slice(0, 5).map((cat) => (
                            <div key={cat.name} className="flex flex-shrink-0 items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span className="max-w-[120px] truncate font-medium">{cat.name}</span>
                              <span><PrivacyNumber value={Math.round(cat.percent)}>{Math.round(cat.percent)}%</PrivacyNumber></span>
                            </div>
                          ))}
                          {quickStats.breakdown.length > 5 && (
                            <span className="flex-shrink-0 italic text-slate-500 dark:text-[#666]">+{quickStats.breakdown.length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                   <TransactionTable
                       items={items}
                       monthlyNetByMonth={monthlyNetByMonth}
                       sortBy={sortBy}
                       order={order}
                       toggleSort={toggleSort}
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
                       loading={loading}
                       total={total}
                       scrollRef={scrollContainerRef}
                   />
                </div>
                
                {/* Scroll To Top */}
                {showScrollTop && (
                  <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-30 rounded-full border border-slate-200 bg-white p-3 text-slate-700 shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:border-[#2b2b2b] dark:bg-[#111111] dark:text-[#d8d8d8] dark:hover:bg-[#151515]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
            </div>
        </div>

        {/* Floating Bulk Actions - only if not handled inside, but good to have fixed */}
        {selectionMode && selectedIds.size > 0 && (
             <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-slate-900 dark:bg-[#111111] text-slate-50 dark:text-[#f0f0f0] border border-slate-700 dark:border-[#282828] rounded-full shadow-xl shadow-black/30 animate-in slide-in-from-bottom-10 fade-in duration-200">
               <span className="font-medium whitespace-nowrap text-sm pl-1">
                 {selectedIds.size} selected
               </span>
               <div className="h-4 w-px bg-slate-700 mx-1"></div>
               <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-3 py-1.5 text-sm font-medium hover:bg-slate-800/60 rounded-lg transition-colors"
               >
                  Change Category
               </button>
               <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
               >
                  Delete
               </button>
               <div className="h-4 w-px bg-slate-700 mx-1"></div>
               <button
                 onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
                 className="p-1 hover:bg-slate-800/60 rounded-full transition-colors"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                   <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                 </svg>
               </button>
             </div>
        )}

        {/* Undo Deletion Notice */}
        {showUndoNotice && deletionHistory.length > 0 && (
             <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 bg-orange-600 dark:bg-orange-700 text-white border border-orange-700 dark:border-orange-600 rounded-full shadow-xl shadow-black/30 animate-in slide-in-from-bottom-10 fade-in duration-200">
               <div className="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <span className="font-medium text-sm whitespace-nowrap">Deletion in progress...</span>
               </div>
               <button 
                 onClick={handleUndo}
                 title="Undo deletion (Ctrl+Z)"
                 className="px-3 py-1.5 text-sm font-semibold bg-white text-orange-600 hover:bg-orange-50 rounded-lg transition-colors ml-2"
               >
                 Undo (Ctrl+Z)
               </button>
             </div>
        )}

        {/* Modals */}
        <TransactionModal 
            isOpen={showModal}
            onClose={() => {
                setShowModal(false)
                setEditingId(null)
            }}
            onSave={createTxn}
            onDelete={handleDeleteTransaction}
            editingId={editingId}
            initialData={form}
            categories={categories}
        />

        {showCategoryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#101010] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1f1f1f] flex justify-between items-center">
                  <h3 className="font-bold text-xl text-slate-900 dark:text-[#f0f0f0]">Select Category</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#1a1a1a]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                   {['Expense', 'Income', 'Transfer'].map(type => {
                     const typeCats = categories.filter(c => c.type === type).sort((a,b)=>a.name.localeCompare(b.name));
                     if (typeCats.length === 0) return null;
                     return (
                       <div key={type} className="mb-2">
                          <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">{type}</div>
                          {typeCats.map(cat => (
                             <button key={cat.id} onClick={()=>handleBulkUpdateCategory(cat.id)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a1a1a] flex items-center justify-between group">
                                <span className="text-slate-700 dark:text-[#d8d8d8] font-medium group-hover:text-slate-900 dark:group-hover:text-white">{cat.name}</span>
                                <div className={`w-2 h-2 rounded-full ${cat.type==='Income'?'bg-emerald-500':cat.type==='Transfer'?'bg-blue-500':'bg-rose-500'}`}></div>
                             </button>
                          ))}
                       </div>
                     )
                   })}
                </div>
              </div>
            </div>
        )}
    </div>
  )
}
