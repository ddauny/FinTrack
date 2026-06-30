import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { useToast } from '../contexts/ToastContext'

interface Category {
  id: number
  name: string
  type: string
  color?: string
}

interface Account {
  id: number
  name: string
  type: string
}

interface ParsedTransaction {
  id: string // local react key
  date: string
  amount: number
  type: 'Income' | 'Expense' | 'Transfer'
  notes: string
  suggestedCategoryId?: number | null
  suggestedAccountId?: number | null
  isDuplicate?: boolean
  selected: boolean
}

interface ScreenshotOcrModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  accounts: Account[]
  onSuccess: () => void
}

function CategoryDropdown({
  value,
  onChange,
  categories,
  disabled
}: {
  value: number | null | undefined
  onChange: (id: number) => void
  categories: Category[]
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedCategory = categories.find(c => c.id === value)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative inline-block w-full text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-transparent hover:bg-slate-100 dark:hover:bg-[#181818] rounded px-2 py-1.5 transition-colors font-medium text-slate-800 dark:text-[#f0f0f0] outline-none text-left disabled:opacity-50"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedCategory ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedCategory.color || '#3b82f6' }}
              />
              <span className="truncate">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-[#888]">Select Category</span>
          )}
        </span>
        <svg className="w-4 h-4 ml-1 text-slate-400 dark:text-[#888] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-1 w-56 z-50 rounded-lg border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#181818] shadow-xl max-h-60 overflow-y-auto animate-in fade-in duration-100">
          <div className="py-1">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setIsOpen(false); }}
                className={`flex items-center w-full px-3 py-2.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-ui-surface transition-colors ${value === c.id ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-[#f0f0f0]'}`}
              >
                <span
                  className="w-2 h-2 rounded-full mr-2.5 shrink-0"
                  style={{ backgroundColor: c.color || '#3b82f6' }}
                />
                <span className="truncate flex-1">{c.name}</span>
                <span className="ml-2 text-[9px] text-slate-400 dark:text-[#888] uppercase tracking-wider font-semibold">
                  {c.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ScreenshotOcrModal({
  isOpen,
  onClose,
  categories,
  accounts,
  onSuccess
}: ScreenshotOcrModalProps) {
  const { showToast } = useToast()
  
  const [step, setStep] = useState<'upload' | 'loading' | 'review'>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [parsedTxns, setParsedTxns] = useState<ParsedTransaction[]>([])
  const [importing, setImporting] = useState(false)
  const [existingTxns, setExistingTxns] = useState<any[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep('upload')
      setSelectedFiles([])
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setPreviewUrls([])
      setParsedTxns([])
      setImporting(false)
      setExistingTxns([])
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Fetch existing transactions matching the parsed transactions date range
  const datesKey = parsedTxns.map(t => t.date).join(',')

  useEffect(() => {
    if (step !== 'review' || parsedTxns.length === 0) {
      setExistingTxns([])
      return
    }

    const fetchExisting = async () => {
      setLoadingExisting(true)
      try {
        const dates = parsedTxns.map(t => t.date).filter(Boolean)
        if (dates.length === 0) return
        const minDate = dates.reduce((min, d) => (d < min ? d : min), dates[0])
        const maxDate = dates.reduce((max, d) => (d > max ? d : max), dates[0])
        
        const res = await api.transactions.list(`?startDate=${minDate}&endDate=${maxDate}&limit=1000&sortBy=date&order=desc`)
        setExistingTxns((res as any).items || [])
      } catch (error) {
        console.error('Failed to fetch existing transactions:', error)
      } finally {
        setLoadingExisting(false)
      }
    }

    fetchExisting()
  }, [datesKey, step])

  if (!isOpen) return null

  // File handling
  const handleFilesChange = (files: FileList | File[]) => {
    const fileList = Array.from(files)
    const validFiles = fileList.filter(file => file.type.startsWith('image/'))
    
    if (validFiles.length === 0) {
      showToast('Please upload valid image files.', 'error')
      return
    }

    if (validFiles.length < fileList.length) {
      showToast('Some files were ignored because they are not images.', 'warning')
    }

    setSelectedFiles(validFiles)
    
    // Revoke previous URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    const urls = validFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
    
    processFiles(validFiles)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => {
    setDragOver(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesChange(e.dataTransfer.files)
    }
  }

  // API Call to parse screenshots
  const processFiles = async (files: File[]) => {
    setStep('loading')
    try {
      const response = await api.transactions.parseScreenshot(files)
      
      const mapped: ParsedTransaction[] = response.transactions.map((tx: any, index: number) => {
        const catId = tx.suggestedCategoryId || categories[0]?.id || null
        const cat = categories.find(c => c.id === catId)
        const txnType = cat ? (cat.type as any) : (tx.type === 'Income' ? 'Income' : tx.type === 'Transfer' ? 'Transfer' : 'Expense')
        return {
          id: `tx-${index}-${Date.now()}`,
          date: tx.date || new Date().toISOString().slice(0, 10),
          amount: Math.abs(tx.amount) || 0,
          type: txnType,
          notes: tx.notes || '',
          suggestedCategoryId: catId,
          suggestedAccountId: tx.suggestedAccountId || accounts[0]?.id || null,
          isDuplicate: !!tx.isDuplicate,
          selected: !tx.isDuplicate // Auto-deselect duplicates
        }
      })

      // Sort mapped transactions by date descending (latest first)
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setParsedTxns(mapped)
      setStep('review')
    } catch (error: any) {
      console.error(error)
      let errMsg = 'Failed to parse screenshots.'
      if (error.message) {
        try {
          const parsedErr = JSON.parse(error.message)
          if (parsedErr && parsedErr.error) {
            errMsg = parsedErr.error
          } else {
            errMsg = error.message
          }
        } catch {
          errMsg = error.message
        }
      }
      showToast(errMsg, 'error')
      setStep('upload')
    }
  }

  // Row update handlers
  const toggleSelect = (id: string) => {
    setParsedTxns(prev =>
      prev.map(t => (t.id === id ? { ...t, selected: !t.selected } : t))
    )
  }

  const updateRowField = (id: string, field: keyof ParsedTransaction, value: any) => {
    setParsedTxns(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = { ...t, [field]: value }
          if (field === 'suggestedCategoryId') {
            const cat = categories.find(c => c.id === value)
            if (cat) {
              updated.type = cat.type as any
            }
          }
          return updated
        }
        return t
      })
    )
  }

  // Bulk import call
  const handleImport = async () => {
    const selected = parsedTxns.filter(t => t.selected)
    if (selected.length === 0) {
      showToast('Select at least one transaction to import.', 'warning')
      return
    }

    // Check if any selected transaction is missing category
    const invalid = selected.find(t => !t.suggestedCategoryId)
    if (invalid) {
      showToast('Please select a Category for all selected transactions.', 'warning')
      return
    }

    setImporting(true)
    try {
      const payload = selected.map(t => ({
        date: t.date,
        amount: Number(t.amount),
        type: t.type,
        notes: t.notes,
        categoryId: Number(t.suggestedCategoryId),
        accountId: Number(t.suggestedAccountId || accounts[0]?.id)
      }))

      await api.transactions.bulkCreate(payload)
      showToast(`Imported ${selected.length} transactions successfully!`, 'success')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      showToast('Failed to import transactions.', 'error')
    } finally {
      setImporting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#090909] overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
      <div className="w-full h-full bg-white dark:bg-[#111] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111] z-10 shrink-0">
          <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-[#f0f0f0] tracking-tight">
                Scan Transactions Screenshot
              </h3>
              <p className="text-xs text-slate-400 dark:text-[#888] mt-0.5">
                Upload a screenshot of your bank statement or card movements to import in bulk using Gemini AI
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#888] dark:hover:text-[#f0f0f0] hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-[#090909] p-6 ${
          step === 'review'
            ? 'overflow-hidden'
            : 'overflow-y-auto items-center justify-center min-h-[350px]'
        }`}>
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`w-full max-w-xl p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10'
                  : 'border-slate-300 dark:border-[#1f1f1f] bg-white dark:bg-[#111] hover:border-blue-500 dark:hover:border-blue-500/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={e => e.target.files && handleFilesChange(e.target.files)}
              />
              
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 00-1.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              
              <p className="text-sm font-semibold text-slate-800 dark:text-[#f0f0f0] text-center">
                Drag and drop your screenshots here, or <span className="text-blue-500 hover:underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-[#888] mt-1.5 text-center">
                Supports multiple PNG, JPG, JPEG bank transaction screen captures
              </p>
            </div>
          )}

          {/* STEP 2: LOADING / SCANNING */}
          {step === 'loading' && (
            <div className="w-full flex flex-col items-center py-6">
              <div className="flex flex-wrap justify-center gap-3 mb-6 max-w-2xl">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative w-24 h-32 bg-slate-200 dark:bg-[#111] rounded-lg border border-slate-300 dark:border-[#1f1f1f] overflow-hidden shadow-md flex items-center justify-center">
                    <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain opacity-60" />
                    <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10b981] animate-[scan_2s_ease-in-out_infinite]" style={{
                      animationName: 'scan',
                      animationDelay: `${idx * 250}ms`
                    }} />
                  </div>
                ))}
                
                <style>{`
                  @keyframes scan {
                    0%, 100% { top: 5%; }
                    50% { top: 95%; }
                  }
                `}</style>
              </div>

              <div className="text-center space-y-2">
                <div className="h-5 flex items-center justify-center">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <h4 className="font-semibold text-sm text-slate-800 dark:text-[#f0f0f0]">
                  Gemini AI is parsing your {selectedFiles.length === 1 ? 'screenshot' : `${selectedFiles.length} screenshots`}...
                </h4>
                <p className="text-xs text-slate-400 dark:text-[#888]">
                  Extracting dates, amounts, notes, and predicting categories in parallel
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW AND EDIT */}
          {step === 'review' && (
            <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row h-full gap-6 overflow-hidden py-2 animate-in fade-in duration-200">
              
              {/* Left Column (3/4 on Desktop): Table & Toolbar */}
              <div className="flex-1 flex flex-col h-full space-y-4 overflow-hidden">
                {/* Toolbar/Stats */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between w-full bg-white dark:bg-[#111] p-3 rounded-xl border border-slate-200 dark:border-[#1f1f1f] text-xs shrink-0">
                  <span className="font-medium text-slate-600 dark:text-[#888]">
                    Detected <span className="text-blue-500 font-bold">{parsedTxns.length}</span> {parsedTxns.length === 1 ? 'transaction' : 'transactions'}. Selected for import: <span className="text-emerald-500 font-bold">{parsedTxns.filter(t => t.selected).length}</span>
                  </span>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setParsedTxns(prev => prev.map(t => ({ ...t, selected: true })))}
                      className="flex-1 sm:flex-initial text-center px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#282828] text-slate-600 dark:text-[#f0f0f0] transition-colors font-semibold"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setParsedTxns(prev => prev.map(t => ({ ...t, selected: false })))}
                      className="flex-1 sm:flex-initial text-center px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#282828] text-slate-600 dark:text-[#f0f0f0] transition-colors font-semibold"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto border border-slate-200 dark:border-[#1f1f1f] rounded-xl bg-white dark:bg-[#111] shadow-sm">
                  <table className="w-full text-left border-collapse text-xs relative">
                    <thead>
                      <tr className="text-slate-500 dark:text-[#888] uppercase font-bold tracking-wider border-b border-slate-200 dark:border-[#1f1f1f]">
                        <th className="sticky top-0 bg-slate-50 dark:bg-[#151515] z-20 py-3.5 px-4 w-10 text-center">Import</th>
                        <th className="sticky top-0 bg-slate-50 dark:bg-[#151515] z-20 py-3.5 px-4 w-36">Date</th>
                        <th className="sticky top-0 bg-slate-50 dark:bg-[#151515] z-20 py-3.5 px-4 w-32 text-right">Amount</th>
                        <th className="sticky top-0 bg-slate-50 dark:bg-[#151515] z-20 py-3.5 px-4 w-48">Category</th>
                        <th className="sticky top-0 bg-slate-50 dark:bg-[#151515] z-20 py-3.5 px-4">Notes / Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1f1f1f]">
                      {parsedTxns.map(tx => (
                        <tr
                          key={tx.id}
                          onClick={() => toggleSelect(tx.id)}
                          className={`cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#161616]/40 transition-colors ${
                            !tx.selected ? 'opacity-60 bg-slate-50/20 dark:bg-[#0c0c0c]/10' : ''
                          }`}
                        >
                          {/* Selector checkbox */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={tx.selected}
                              onChange={() => toggleSelect(tx.id)}
                              onClick={e => e.stopPropagation()}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-[#1f1f1f] dark:bg-[#181818] cursor-pointer"
                            />
                          </td>

                          {/* Date field */}
                          <td className="py-2.5 px-4">
                            <input
                              type="date"
                              value={tx.date}
                              disabled={!tx.selected}
                              onChange={e => updateRowField(tx.id, 'date', e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full bg-transparent border-0 rounded px-2 py-1 font-medium outline-none hover:bg-slate-100 dark:hover:bg-[#181818] focus:bg-slate-100 dark:focus:bg-[#181818] focus:ring-1 focus:ring-blue-500/30 dark:text-[#f0f0f0] disabled:opacity-50 cursor-pointer"
                            />
                          </td>

                          {/* Amount input */}
                          <td className="py-2.5 px-4 text-right">
                            <div className="relative inline-block w-full" onClick={e => e.stopPropagation()}>
                              <span className={`absolute left-2 top-1/2 -translate-y-1/2 font-medium ${
                                tx.type === 'Income'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : tx.type === 'Transfer'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                €
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={tx.amount}
                                disabled={!tx.selected}
                                onChange={e =>
                                  updateRowField(tx.id, 'amount', parseFloat(e.target.value) || 0)
                                }
                                className={`w-full pl-5 pr-2 py-1 text-right bg-transparent border-0 rounded font-bold outline-none hover:bg-slate-100 dark:hover:bg-[#181818] focus:bg-slate-100 dark:focus:bg-[#181818] focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50 ${
                                  tx.type === 'Income'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : tx.type === 'Transfer'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Category selection */}
                          <td className="py-2.5 px-4">
                            <div onClick={e => e.stopPropagation()}>
                              <CategoryDropdown
                                value={tx.suggestedCategoryId}
                                disabled={!tx.selected}
                                categories={categories}
                                onChange={val => updateRowField(tx.id, 'suggestedCategoryId', val)}
                              />
                            </div>
                          </td>

                          {/* Notes field */}
                          <td className="py-2.5 px-4">
                            <div className="flex flex-col gap-1 w-full" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={tx.notes}
                                disabled={!tx.selected}
                                onChange={e => updateRowField(tx.id, 'notes', e.target.value)}
                                placeholder="Transaction notes"
                                className="w-full bg-transparent border-0 rounded px-2 py-1 outline-none hover:bg-slate-100 dark:hover:bg-[#181818] focus:bg-slate-100 dark:focus:bg-[#181818] focus:ring-1 focus:ring-blue-500/30 dark:text-[#f0f0f0] disabled:opacity-50"
                              />
                              {tx.isDuplicate && (
                                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 px-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                  </svg>
                                  Possible duplicate found
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column (1/4 on Desktop): Existing Recorded Transactions */}
              <div className="hidden md:flex w-72 shrink-0 flex-col h-full border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111] rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1f1f1f] bg-slate-50 dark:bg-[#151515] shrink-0">
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-[#f0f0f0] uppercase tracking-wider">
                    Recorded History
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-[#888] mt-0.5">
                    Existing transactions in this date range
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {loadingExisting ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <div className="h-4 w-4 animate-spin rounded-full border border-blue-500 border-t-transparent" />
                      <span className="text-[10px] text-slate-400 dark:text-[#888]">Loading history...</span>
                    </div>
                  ) : existingTxns.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-[10px] text-slate-400 dark:text-[#888]">No transactions recorded for these dates.</span>
                    </div>
                  ) : (
                    existingTxns.map((txn: any) => {
                      const isIncome = txn.type === 'Income';
                      const isTransfer = txn.type === 'Transfer';
                      return (
                        <div
                          key={txn.id}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-[#1c1c1c] bg-slate-50/50 dark:bg-[#151515]/30 hover:border-slate-200 dark:hover:border-[#282828] transition-all flex flex-col gap-1 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-500 dark:text-[#888] text-[10px]">
                              {txn.date.slice(0, 10)}
                            </span>
                            <span className={`font-bold ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isTransfer
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isIncome ? '+' : isTransfer ? '' : '-'}€{Number(txn.amount).toFixed(2)}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-[#f0f0f0] truncate">
                            {txn.notes || 'No description'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {txn.category && (
                              <span
                                className="px-2 py-0.5 rounded text-[9px] font-semibold text-white truncate max-w-[120px]"
                                style={{ backgroundColor: txn.category.color || '#3b82f6' }}
                              >
                                {txn.category.name}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 dark:text-[#666] uppercase tracking-wider font-semibold">
                              {txn.type}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-[#1f1f1f] bg-white dark:bg-[#111] shrink-0">
          <div className="max-w-6xl mx-auto w-full px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 justify-between items-center">
            <div className="flex flex-col sm:flex-row w-full sm:w-auto">
              {step === 'review' && (
                <button
                  onClick={() => setStep('upload')}
                  disabled={importing}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-[#1f1f1f] rounded-lg text-slate-600 dark:text-[#f0f0f0] hover:bg-slate-50 dark:hover:bg-[#181818] transition-colors font-semibold text-xs disabled:opacity-50 text-center"
                >
                  Back to Upload
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                disabled={importing}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-[#1f1f1f] rounded-lg text-slate-600 dark:text-[#f0f0f0] hover:bg-slate-50 dark:hover:bg-[#181818] transition-colors font-semibold text-xs disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              
              {step === 'review' && (
                <button
                  onClick={handleImport}
                  disabled={importing || parsedTxns.filter(t => t.selected).length === 0}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                      </svg>
                      Import Selected ({parsedTxns.filter(t => t.selected).length})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
