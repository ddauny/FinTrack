import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TransactionFiltersProps {
  startDate: string
  setStartDate: (d: string) => void
  endDate: string
  setEndDate: (d: string) => void
  txnType: string
  setTxnType: (t: string) => void
  selectedCategory: string
  setSelectedCategory: (c: string) => void
  minAmount: string
  setMinAmount: (a: string) => void
  maxAmount: string
  setMaxAmount: (a: string) => void
  categories: any[]
  onClearFilters: () => void
  minAmountValue: number
  maxAmountValue: number
  amountMinLimit: number
  amountMaxLimit: number
  isOpen: boolean
  onClose: () => void
}

const DATE_PRESETS = [
  { label: 'Today', getValue: () => { const t = new Date().toISOString().slice(0,10); return { start: t, end: t } } },
  { label: 'This Week', getValue: () => {
      const now = new Date(), day = now.getDay(), diff = (day===0 ? -6 : 1)-day
      const mon = new Date(now); mon.setDate(now.getDate()+diff)
      return { start: mon.toISOString().slice(0,10), end: new Date().toISOString().slice(0,10) }
  }},
  { label: 'This Month', getValue: () => {
      const now = new Date()
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), end: new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10) }
  }},
  { label: 'Last Month', getValue: () => {
      const now = new Date()
      return { start: new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,10), end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0,10) }
  }},
  { label: 'Last 3M', getValue: () => {
      const end = new Date(), start = new Date(end.getFullYear(), end.getMonth()-3, end.getDate())
      return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) }
  }},
  { label: 'This Year', getValue: () => {
      const now = new Date()
      return { start: new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10), end: new Date(now.getFullYear(), 11, 31).toISOString().slice(0,10) }
  }},
]

const TYPE_OPTIONS = [
  {
    value: '',
    label: 'All',
    dot: 'bg-slate-400',
    activeBg: 'bg-slate-200/70 dark:bg-slate-500/15',
    activeBorder: 'border-slate-300 dark:border-slate-500/40',
    activeText: 'text-slate-700 dark:text-slate-200',
  },
  {
    value: 'Income',
    label: 'Income',
    dot: 'bg-emerald-400',
    activeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    activeBorder: 'border-emerald-300 dark:border-emerald-500/40',
    activeText: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    value: 'Expense',
    label: 'Expense',
    dot: 'bg-rose-400',
    activeBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    activeBorder: 'border-rose-300 dark:border-rose-500/40',
    activeText: 'text-rose-700 dark:text-rose-300',
  },
  {
    value: 'Transfer',
    label: 'Transfer',
    dot: 'bg-sky-400',
    activeBg: 'bg-sky-500/10 dark:bg-sky-500/15',
    activeBorder: 'border-sky-300 dark:border-sky-500/40',
    activeText: 'text-sky-700 dark:text-sky-300',
  },
]

export function TransactionFilters({
  startDate, setStartDate, endDate, setEndDate,
  txnType, setTxnType, selectedCategory, setSelectedCategory,
  minAmount, setMinAmount, maxAmount, setMaxAmount,
  categories, onClearFilters,
  minAmountValue, maxAmountValue, amountMinLimit, amountMaxLimit,
  isOpen, onClose,
}: TransactionFiltersProps) {
  const [catSearch, setCatSearch] = useState('')
  const catInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setCatSearch('')
    setTimeout(() => catInputRef.current?.focus(), 60)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  const hasActiveFilters = !!(startDate || endDate || txnType || selectedCategory || minAmount || maxAmount)

  const activePresetLabel = DATE_PRESETS.find(p => {
    const v = p.getValue(); return v.start === startDate && v.end === endDate
  })?.label ?? null

  const filteredCats = useMemo(() => (
    categories
      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  ), [categories, catSearch])

  const catsByType = useMemo(() => (
    (['Expense', 'Income', 'Transfer'] as const)
      .map(type => ({ type, cats: filteredCats.filter(c => c.type === type) }))
      .filter(g => g.cats.length > 0)
  ), [filteredCats])

  const typeColor = (t: string) => t==='Income' ? '#34d399' : t==='Expense' ? '#f87171' : '#38bdf8'

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] transition-all duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close filters"
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Transaction filters"
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-1/2 top-1/2 flex w-[min(520px,calc(100vw-1.5rem))] max-h-[calc(100dvh-2.5rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 transition-all duration-200 dark:border-[#272727] dark:bg-[#101010] dark:shadow-black/70 ${
          isOpen ? '-translate-y-1/2 scale-100 opacity-100' : '-translate-y-[47%] scale-[0.98] opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[#f0f0f0]">Filters</h2>
            {hasActiveFilters && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-[#666] dark:hover:bg-[#1b1b1b] dark:hover:text-[#d8d8d8]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            <section>
              <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#777]">Type</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TYPE_OPTIONS.map((opt) => {
                  const active = txnType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTxnType(opt.value)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                        active
                          ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText}`
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-[#2a2a2a] dark:bg-[#151515] dark:text-[#777] dark:hover:border-[#393939] dark:hover:text-[#ccc]'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-5 dark:border-[#1f1f1f]">
              <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#777]">Date Range</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {DATE_PRESETS.map((p) => {
                  const active = activePresetLabel === p.label
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setStartDate('')
                          setEndDate('')
                        } else {
                          const v = p.getValue()
                          setStartDate(v.start)
                          setEndDate(v.end)
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? 'border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-[#2a2a2a] dark:bg-[#141414] dark:text-[#777] dark:hover:border-[#393939] dark:hover:text-[#ccc]'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { label: 'From', value: startDate, onChange: (v: string) => setStartDate(v) },
                  { label: 'To', value: endDate, onChange: (v: string) => setEndDate(v) },
                ].map((f) => (
                  <label key={f.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#262626] dark:bg-[#151515] transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-500/15">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#777]">{f.label}</span>
                    <input
                      type="date"
                      value={f.value}
                      onChange={(e) => f.onChange(e.target.value)}
                      className="w-full border-none bg-transparent p-0 text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 focus:!shadow-none [color-scheme:light] dark:text-[#ddd] dark:[color-scheme:dark]"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-5 dark:border-[#1f1f1f]">
              <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#777]">Amount</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { label: 'Min EUR', value: minAmount, onChange: (v: string) => setMinAmount(v), placeholder: '0' },
                  { label: 'Max EUR', value: maxAmount, onChange: (v: string) => setMaxAmount(v), placeholder: 'No limit' },
                ].map((f) => (
                  <label key={f.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#262626] dark:bg-[#151515] transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-500/15">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#777]">{f.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={f.value}
                      placeholder={f.placeholder}
                      onChange={(e) => f.onChange(e.target.value)}
                      className="w-full border-none bg-transparent p-0 text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 focus:!shadow-none placeholder:text-slate-400 dark:text-[#ddd] dark:placeholder:text-[#555]"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-[#777]">
                Visible range: EUR {minAmountValue.toFixed(0)} to EUR {maxAmountValue.toFixed(0)}.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-[#666]">
                Detected max amount in current list: EUR {amountMaxLimit.toFixed(0)} (min floor {amountMinLimit.toFixed(0)}).
              </p>
            </section>

            <section className="border-t border-slate-200 pt-5 dark:border-[#1f1f1f]">
              <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-[#777]">Category</h3>

              <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[#262626] dark:bg-[#151515] transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-500/15">
                <svg className="h-4 w-4 text-slate-400 dark:text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  ref={catInputRef}
                  type="text"
                  value={catSearch}
                  placeholder="Search category"
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="w-full border-none bg-transparent p-0 text-sm text-slate-700 focus:outline-none focus:ring-0 focus:!shadow-none placeholder:text-slate-400 dark:text-[#ddd] dark:placeholder:text-[#555]"
                />
                {catSearch && (
                  <button
                    type="button"
                    onClick={() => setCatSearch('')}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-[#666] dark:hover:bg-[#1e1e1e] dark:hover:text-[#ddd]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('')}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                      !selectedCategory
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-[#2a2a2a] dark:bg-[#141414] dark:text-[#777] dark:hover:border-[#393939] dark:hover:text-[#ccc]'
                    }`}
                  >
                    All Categories
                  </button>
                </div>

                {catsByType.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:border-[#2a2a2a] dark:bg-[#141414] dark:text-[#777]">
                    No categories found.
                  </div>
                )}

                {catsByType.map(({ type, cats }) => (
                  <div key={type}>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#777]">{type}</div>
                    <div className="flex flex-wrap gap-2">
                      {cats.map((c) => {
                        const active = selectedCategory === c.name
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCategory(active ? '' : c.name)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                              active
                                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/12 dark:text-blue-300'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-[#2a2a2a] dark:bg-[#141414] dark:text-[#888] dark:hover:border-[#393939] dark:hover:text-[#ddd]'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color || typeColor(type) }} />
                            <span>{c.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-[#1f1f1f] dark:bg-[#121212]">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-[#343434] dark:text-[#bbb] dark:hover:bg-[#1a1a1a]"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.98]"
          >
            Apply Filters
          </button>
        </div>
      </section>
    </div>,
    document.body
  )
}
