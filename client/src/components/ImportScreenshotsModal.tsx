import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { ExtractedTransaction, Category } from '../types'
import { formatEUR } from '../lib/format'

type EditableItem = ExtractedTransaction & { included: boolean }

interface Props {
  categories: Category[]
  onClose: () => void
  onImported: () => void
}

export function ImportScreenshotsModal({ categories, onClose, onImported }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [items, setItems] = useState<EditableItem[]>([])
  const [extractErrors, setExtractErrors] = useState<{ file: string; message: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiNotConfigured, setAiNotConfigured] = useState(false)
  const [importIssues, setImportIssues] = useState<{ index: number; field: string; message: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const includedItems = useMemo(() => items.filter(i => i.included), [items])
  const totalAmount = useMemo(() => includedItems.reduce((s, i) => s + i.amount, 0), [includedItems])

  // Revoke object URLs before replacing them, and on unmount, so previews
  // don't leak for the life of the tab as screenshots are added/removed.
  const previewsRef = useRef<string[]>([])
  useEffect(() => { previewsRef.current = previews })
  useEffect(() => () => { previewsRef.current.forEach(url => URL.revokeObjectURL(url)) }, [])

  function addFiles(newFiles: FileList | File[]) {
    const accepted = Array.from(newFiles).filter(f =>
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)
    )
    if (accepted.length === 0) {
      setError('Only PNG, JPG or WEBP images are supported.')
      return
    }
    setError(null)
    const merged = [...files, ...accepted].slice(0, 20)
    setFiles(merged)
    previews.forEach(url => URL.revokeObjectURL(url))
    setPreviews(merged.map(f => URL.createObjectURL(f)))
  }

  function removeFile(idx: number) {
    const merged = files.filter((_, i) => i !== idx)
    setFiles(merged)
    previews.forEach(url => URL.revokeObjectURL(url))
    setPreviews(merged.map(f => URL.createObjectURL(f)))
  }

  async function handleExtract() {
    if (files.length === 0) { setError('Please add at least one screenshot.'); return }
    setLoading(true)
    setError(null)
    setAiNotConfigured(false)
    try {
      const res = await api.transactions.extractScreenshots(files)
      setExtractErrors(res.errors)
      setItems(
        res.items.map(it => ({
          ...it,
          // Auto-exclude duplicates (still shown, user can re-include)
          included: !it.isDuplicate,
        }))
      )
      setStep('review')
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e?.message || '{}')
        if (parsed.error === 'AI_NOT_CONFIGURED') {
          setAiNotConfigured(true)
        } else {
          setError(parsed.message || parsed.error || `Extraction failed: ${e?.message}`)
        }
      } catch {
        setError(`Extraction failed: ${e?.message || 'unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  function updateItem(idx: number, patch: Partial<EditableItem>) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, ...patch }
      // When type changes, reset category if it doesn't match the new type
      if (patch.type) {
        const cat = categories.find(c => c.id === next.categoryId)
        if (cat && cat.type !== patch.type) {
          const fallback = categories.find(c => c.type === patch.type)
          if (fallback) {
            next.categoryId = fallback.id
            next.categoryName = fallback.name
          }
        }
      }
      if (patch.categoryId) {
        next.categoryName = categories.find(c => c.id === patch.categoryId)?.name || next.categoryName
      }
      return next
    }))
    setImportIssues([])
  }

  async function handleConfirm() {
    if (includedItems.length === 0) { setError('No transaction selected.'); return }
    setLoading(true)
    setError(null)
    setImportIssues([])
    try {
      const payload = includedItems.map(i => ({
        date: i.date,
        merchant: i.merchant,
        amount: Number(i.amount),
        type: i.type,
        categoryId: i.categoryId,
      }))
      await api.transactions.bulkImport(payload)
      onImported()
      onClose()
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e?.message || '{}')
        if (parsed.issues) {
          setImportIssues(parsed.issues)
          setError('Some rows are invalid. Fix them below and retry.')
        } else {
          setError(parsed.error || `Import failed: ${e?.message}`)
        }
      } catch {
        setError(`Import failed: ${e?.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Server `issues[].index` refers to the position within the *included* items
  // (the array actually sent to bulk-import). Map a global item index to its
  // position among included items; -1 if the item is not included.
  const includedPosition = (globalIdx: number): number => {
    let pos = -1
    for (let i = 0; i <= globalIdx; i++) if (items[i].included) pos++
    return items[globalIdx]?.included ? pos : -1
  }
  const issueForRow = (globalIdx: number) => {
    const pos = includedPosition(globalIdx)
    return pos === -1 ? [] : importIssues.filter(i => i.index === pos)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-white dark:bg-stone-900 sm:bg-black/60 p-0 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl bg-white dark:bg-stone-900 sm:rounded-2xl shadow-none sm:shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95">

        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-xl text-stone-900 dark:text-white">Import from Screenshot</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {step === 'upload' ? 'Upload screenshots, then review extracted transactions' : 'Review and edit before confirming'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 hide-scrollbar">

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {aiNotConfigured && (
            <div className="px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
              <span>Configura la tua chiave AI nelle Impostazioni per usare l'import da screenshot.</span>
              <Link
                to="/settings"
                onClick={onClose}
                className="shrink-0 px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
              >
                Vai alle Impostazioni
              </Link>
            </div>
          )}

          {step === 'upload' && (
            <>
              {/* Dropzone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-stone-400 mb-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Drag & drop screenshots here, or click to browse</p>
                <p className="text-xs text-stone-400 mt-1">PNG, JPG or WEBP — up to 20 images</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* Previews */}
              {files.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img src={src} alt={files[idx].name} className="w-full h-24 object-cover rounded-lg border border-stone-200 dark:border-stone-700" />
                      <button
                        onClick={e => { e.stopPropagation(); removeFile(idx) }}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'review' && (
            <>
              {/* Per-file extraction errors */}
              {extractErrors.length > 0 && (
                <div className="space-y-1">
                  {extractErrors.map((e, i) => (
                    <div key={i} className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                      Couldn't read <span className="font-semibold">{e.file}</span>: {e.message}
                    </div>
                  ))}
                </div>
              )}

              {items.length === 0 && extractErrors.length === 0 && (
                <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-8">No transactions were found in the uploaded images.</p>
              )}

              {items.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        <th className="p-2 w-[32px]"></th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Merchant</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Category</th>
                        <th className="p-2 w-[32px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const rowIssues = issueForRow(idx)
                        const catOptions = categories.filter(c => c.type === it.type)
                        return (
                          <tr key={it.tempId} className={`border-b border-stone-100 dark:border-stone-700 ${!it.included ? 'opacity-50' : ''} ${rowIssues.length > 0 ? 'bg-red-50/60 dark:bg-red-900/10' : ''}`}>
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={it.included}
                                onChange={e => updateItem(idx, { included: e.target.checked })}
                                className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-stone-900 focus:ring-stone-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date"
                                value={it.date}
                                onChange={e => updateItem(idx, { date: e.target.value })}
                                className="px-1.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 w-[130px]"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={it.merchant}
                                onChange={e => updateItem(idx, { merchant: e.target.value })}
                                className="w-full px-1.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 min-w-[120px]"
                              />
                              {it.isDuplicate && (
                                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-medium">
                                  Possible duplicate{it.duplicateId ? ` (#${it.duplicateId})` : ''}
                                </div>
                              )}
                              {rowIssues.map((iss, i) => (
                                <div key={i} className="mt-1 text-[10px] text-red-600 dark:text-red-400">{iss.field}: {iss.message}</div>
                              ))}
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.amount}
                                onChange={e => updateItem(idx, { amount: Number(e.target.value) })}
                                className="px-1.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 w-[90px]"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={it.type}
                                onChange={e => updateItem(idx, { type: e.target.value as 'Income' | 'Expense' })}
                                className="px-1.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100"
                              >
                                <option value="Expense">Expense</option>
                                <option value="Income">Income</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                value={it.categoryId}
                                onChange={e => updateItem(idx, { categoryId: Number(e.target.value) })}
                                className="px-1.5 py-1 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 max-w-[140px]"
                              >
                                {catOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </td>
                            <td className="p-2">
                              <button
                                title="Remove row"
                                onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 shrink-0">
          {step === 'review' && items.length > 0 && (
            <div className="text-sm text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-900 dark:text-white">{includedItems.length}</span> selected
              {' · '}total <span className="font-semibold text-stone-900 dark:text-white">{formatEUR(totalAmount)}</span>
            </div>
          )}
          {step === 'upload' && <div />}

          <div className="flex items-center gap-2">
            {step === 'review' && (
              <button
                onClick={() => { setStep('upload'); setItems([]); setExtractErrors([]); setImportIssues([]); setError(null) }}
                className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            {step === 'upload' ? (
              <button
                onClick={handleExtract}
                disabled={loading || files.length === 0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Extracting…' : 'Extract transactions'}
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={loading || includedItems.length === 0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Importing…' : `Confirm import (${includedItems.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
