import React, { memo, useMemo } from 'react'
import { formatEUR, formatDateDMY, formatWeekday } from '../../lib/format'
import { PrivacyNumber } from '../PrivacyNumber'
import { useLongPress } from '../../hooks/useLongPress'
import { useToast } from '../../contexts/ToastContext'
import { secureFetch } from '../../lib/api'
import { MobileTransactionCard } from './MobileTransactionCard'

const splitColors = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];

function getSplitColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return splitColors[Math.abs(hash) % splitColors.length];
}

interface TransactionTableProps {
  items: any[]
  monthlyNetByMonth?: Record<string, number>
  sortBy: string
  order: 'asc'|'desc'
  toggleSort: (column: any) => void
  selectionMode: boolean
  selectedIds: Set<number>
  toggleSelectItem: (id: number) => void
  categoryMap: Record<number, any>
  setEditingId: (id: number) => void
  setForm: (form: any) => void
  setCategoryQuery: (q: string) => void
  setShowModal: (show: boolean) => void
  setItems: any
  setTotal: any
  loading?: boolean
  total?: number
  scrollRef?: React.RefObject<HTMLDivElement>
}

// Internal TransactionRow component
const TransactionRow = memo(function TransactionRow({
  t, selectionMode, selectedIds, toggleSelectItem, categoryMap, setEditingId, setForm, setCategoryQuery, setShowModal, isEven
}: any) {
  const { showToast } = useToast();
  const handleRowClick = () => {
    if (selectionMode) toggleSelectItem(t.id);
    else {
      setEditingId(t.id); const category = categoryMap[t.categoryId] || t.category;
      setForm({ date: String(t.date).slice(0, 10), amount: Number(t.amount).toFixed(2), accountId: t.accountId, categoryId: t.categoryId, notes: t.notes || '', tags: t.tags ? t.tags.map((tag: any) => tag.name) : [], isRecurring: false, frequency: 'MONTHLY', endDate: '', attachmentPath: t.attachmentPath });
      setCategoryQuery(category?.name || ''); setShowModal(true);
    }
  };
  const isSelected = selectedIds.has(t.id)
  const isInc = (t as any).type === 'Income' || categoryMap[t.categoryId]?.type === 'Income' || t.category?.type === 'Income'
  const isTrf = (t as any).type === 'Transfer' || categoryMap[t.categoryId]?.type === 'Transfer' || t.category?.type === 'Transfer'

  const longPressProps = useLongPress(
    () => {
      toggleSelectItem(t.id);
    },
    () => {
      handleRowClick();
    },
    { shouldPreventDefault: false, delay: 600 }
  );

  return (
    <tr {...longPressProps} className={`group cursor-pointer border-b border-slate-100 dark:border-[#111] transition-all duration-100 ${isSelected ? 'bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-[#1a1a1a]'}`}>
      <td 
        className="w-[15%] px-4 py-3"
        style={t.splitGroupId ? { borderLeft: `4px solid ${getSplitColor(t.splitGroupId)}` } : undefined}
      >
        <div className="flex items-start gap-2">
          <div className="flex flex-col">
              <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">{formatDateDMY(t.date)}</span>
              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-600 tracking-tight">{formatWeekday(t.date)}</span>
          </div>
          {(t as any).recurringTransactionId && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" title="Recurring transaction">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </span>
          )}
        </div>
      </td>
      <td className={`w-[15%] px-4 py-3 text-sm font-bold tabular-nums ${isInc ? 'text-emerald-600 dark:text-emerald-500' : isTrf ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-500'}`}>
        <PrivacyNumber value={t.amount}>{formatEUR(t.amount)}</PrivacyNumber>
      </td>
      <td className="w-[20%] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (t.category?.color || categoryMap[t.categoryId]?.color) || '#ccc' }} />
          <span className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-300 truncate">
            {t.category?.name || categoryMap[t.categoryId]?.name}
          </span>
        </div>
      </td>
      <td className="w-[50%] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
            <span className="text-xs sm:text-[13px] text-slate-400 dark:text-slate-500 font-medium truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{t.notes || '—'}</span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {t.tags?.map((tag: any) => <span key={tag.id} className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#222]">#{tag.name}</span>)}
                {t.attachmentPath && <svg className="w-3 h-3 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-2.828-6.828l-6.414 6.586a6 6 0 008.485 8.485L17 13" /></svg>}
            </div>
        </div>
      </td>
    </tr>
  );
});

export function TransactionTable({
  items, monthlyNetByMonth, sortBy, order, toggleSort, selectionMode, selectedIds, toggleSelectItem, categoryMap, setEditingId, setForm, setCategoryQuery, setShowModal, setItems, setTotal, loading, total, scrollRef
}: TransactionTableProps) {
  const sortIcon = (id: string) => sortBy === id ? (order === 'asc' ? ' ↑' : ' ↓') : ''
  
  const isEmpty = items.length === 0 && !loading

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#0c0c0c] overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-0">
          
          {/* Desktop Table View */}
          <table className="w-full table-fixed border-collapse hidden md:table">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 dark:bg-[#111] text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 border-b border-slate-200 dark:border-[#1a1a1a]">
                <th className="w-[15%] px-4 py-3.5 text-left cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 transition-colors" onClick={() => toggleSort('date')}>Date{sortIcon('date')}</th>
                <th className="w-[15%] px-4 py-3.5 text-left cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 transition-colors" onClick={() => toggleSort('amount')}>Amount{sortIcon('amount')}</th>
                <th className="w-[20%] px-4 py-3.5 text-left cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 transition-colors" onClick={() => toggleSort('categoryId')}>Category{sortIcon('categoryId')}</th>
                <th className="w-[50%] px-4 py-3.5 text-left cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 transition-colors" onClick={() => toggleSort('notes')}>Notes{sortIcon('notes')}</th>
              </tr>
            </thead>
            <tbody>
                  {isEmpty ? (
                    <tr>
                        <td colSpan={4} className="p-20 text-center text-slate-300 dark:text-slate-700">
                            <div className="w-12 h-12 mx-auto mb-4 opacity-20"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div>
                            <span className="text-xs font-bold uppercase tracking-widest">No matching data streams found</span>
                        </td>
                    </tr>
                  ) : (
                    items.map((item: any, i: number) => {
                     if (!item) return null;
                     const dateObj = new Date(item.date);
                     const currentMonthYear = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                     const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                     let showSep = false, net = 0;
                     if (sortBy === 'date') {
                       const prev = i > 0 ? items[i - 1] : null;
                       const prevMY = prev ? new Date(prev.date).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : null;
                       if (currentMonthYear !== prevMY) { showSep = true; net = monthlyNetByMonth?.[monthKey] || 0; }
                     }
                     return (
                       <React.Fragment key={item.id}>
                         {showSep && (
                            <tr className="bg-slate-50 dark:bg-[#080808] border-y border-slate-100 dark:border-[#1a1a1a]">
                              <td colSpan={4} className="px-4 py-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{currentMonthYear}</span>
                                  <span className={`text-xs font-bold tabular-nums ${net > 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                    Net: <PrivacyNumber value={net}>{formatEUR(net)}</PrivacyNumber>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                         <TransactionRow t={item} isEven={i % 2 === 0} selectionMode={selectionMode} selectedIds={selectedIds} toggleSelectItem={toggleSelectItem} categoryMap={categoryMap} setEditingId={setEditingId} setForm={setForm} setCategoryQuery={setCategoryQuery} setShowModal={setShowModal} />
                       </React.Fragment>
                     );
                    })
                  )}
              </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden py-4">
             {isEmpty ? (
               <div className="p-10 text-center opacity-40">
                  <span className="text-[10px] font-bold uppercase tracking-widest">No entries found</span>
               </div>
             ) : (
               items.map((item: any) => (
                 <MobileTransactionCard
                    key={item.id}
                    transaction={item}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    toggleSelectItem={toggleSelectItem}
                    categoryMap={categoryMap}
                    setEditingId={setEditingId}
                    setForm={setForm}
                    setCategoryQuery={setCategoryQuery}
                    setShowModal={setShowModal}
                 />
               ))
             )}
          </div>

          {loading && (
            <div className="flex justify-center p-8">
              <div className="h-1 w-24 bg-blue-500/20 overflow-hidden rounded-full">
                <div className="h-full bg-blue-500 w-1/2 animate-[shimmer_1.5s_infinite]" />
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
