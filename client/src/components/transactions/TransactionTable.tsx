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
  t,
  selectionMode,
  selectedIds,
  toggleSelectItem,
  categoryMap,
  setEditingId,
  setForm,
  setCategoryQuery,
  setShowModal,
  isEven
}: any) {
  const { showToast } = useToast();
  
  const handleRowClick = () => {
    if (selectionMode) {
      toggleSelectItem(t.id);
    } else {
      setEditingId(t.id);
      const category = categoryMap[t.categoryId] || t.category;
      setForm({
        date: String(t.date).slice(0, 10),
        amount: Number(t.amount).toFixed(2),
        accountId: t.accountId,
        categoryId: t.categoryId,
        notes: t.notes || '',
        tags: t.tags ? t.tags.map((tag: any) => tag.name) : [],
        isRecurring: false,
        frequency: 'MONTHLY',
        endDate: '',
        attachmentPath: t.attachmentPath
      });
      setCategoryQuery(category?.name || '');
      setShowModal(true);
    }
  };

  const handleRowLongPress = () => {
      toggleSelectItem(t.id);
      if (navigator.vibrate) navigator.vibrate(50);
  };

  const longPressProps = useLongPress(handleRowLongPress, handleRowClick, { delay: 500 });
  const isSelected = selectedIds.has(t.id)

  const isIncome = (t as any).type === 'Income' || categoryMap[t.categoryId]?.type === 'Income' || t.category?.type === 'Income'
  const isTransfer = (t as any).type === 'Transfer' || categoryMap[t.categoryId]?.type === 'Transfer' || t.category?.type === 'Transfer'

  return (
    <tr 
      {...longPressProps}
      className={`
        group relative cursor-pointer select-none border-b border-slate-200/70 dark:border-[#1f1f1f] transition-colors duration-150
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/25 hover:bg-blue-100/70 dark:hover:bg-blue-900/35' 
          : isEven 
          ? 'bg-slate-50/60 dark:bg-[#111111] hover:bg-slate-100/70 dark:hover:bg-[#171717]'
          : 'bg-white dark:bg-[#131313] hover:bg-slate-100/70 dark:hover:bg-[#171717]'
        }
      `}
    >
      <td className="relative w-[20%] px-3 py-2.5 align-top">
          {(t as any).splitGroupId && (
            <div 
              className="absolute left-0 top-1 bottom-1 w-1.5 rounded-r-md" 
              style={{ backgroundColor: getSplitColor((t as any).splitGroupId) }}
              title="Part of a split transaction"
            />
          )}
        <div className="flex items-center gap-2">
          {/* Selection Checkbox */}

          
          <div className="flex flex-col">
            <span className="text-[13px] sm:text-sm font-semibold leading-tight text-slate-900 dark:text-[#f0f0f0]">{formatDateDMY(t.date)}</span>
            <span className="text-[11px] text-slate-500 dark:text-[#888] capitalize leading-tight">{formatWeekday(t.date)}</span>
          </div>

          {(t as any).recurringTransactionId && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400" title="Recurring transaction">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h5.5a.75.75 0 00.75-.75v-5.5a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.206 9.633a.75.75 0 001.55.426zm16.039 3.882a.75.75 0 00-1.55-.426 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 100-1.5h-5.5a.75.75 0 00-.75.75v5.5a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.666-4.505z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
      </td>
      <td className={`w-[20%] px-3 py-2.5 text-sm font-bold tabular-nums align-top ${
        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 
        isTransfer ? 'text-blue-600 dark:text-blue-400' :
        'text-rose-600 dark:text-rose-400'
      }`}>
        <div className="flex items-center gap-2">
            <PrivacyNumber value={t.amount}>
            {formatEUR(t.amount)}
            </PrivacyNumber>
            {t.attachmentPath && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    secureFetch(`/api/transactions/${t.id}/attachment`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
                      .then(res => {
                          if (!res.ok) throw new Error('Failed to load');
                          return res.blob();
                      })
                      .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      })
                      .catch(() => showToast('Could not load receipt', 'error'));
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" 
                  title="View Receipt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                  </svg>
                </button>
            )}
        </div>
      </td>
      <td className="w-[25%] px-3 py-2.5 align-top">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: (t.category?.color || categoryMap[t.categoryId]?.color) || '#64748b' }}></div>
            <span className="text-sm font-medium text-slate-700 dark:text-[#d8d8d8]">
              {t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}
            </span>
          </div>
          {t.tags && t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-4">
              {t.tags.map((tag: any) => (
                <span key={tag.id} className="text-blue-600 dark:text-blue-400 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 rounded">
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="hidden w-[35%] px-3 py-2.5 text-sm text-slate-500 dark:text-[#888] italic align-top sm:table-cell">
        {t.notes}
      </td>
    </tr>
  );
});

export function TransactionTable({
  items,
  monthlyNetByMonth,
  sortBy,
  order,
  toggleSort,
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
  loading,
  total,
  scrollRef
}: TransactionTableProps) {
  
  const sortIcon = useMemo(() => order === 'asc' ? '▲' : '▼', [order])

  const headers = [
      { id: 'date', label: 'Date', width: 'w-[20%]' },
      { id: 'amount', label: 'Amount', width: 'w-[20%]' },
      { id: 'categoryId', label: 'Category', width: 'w-[25%]' },
      { id: 'notes', label: 'Notes', width: 'w-[35%]' },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-[#242424] dark:bg-[#111111]/92">
      {/* Table Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-100/85 dark:border-[#1f1f1f] dark:bg-[#101010]">
        <table className="w-full table-fixed text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-[#777]">
          <thead>
            <tr>
              {headers.map(header => (
                <th 
                    key={header.id}
                  className={`cursor-pointer px-3 py-2.5 transition-colors hover:bg-slate-200/50 dark:hover:bg-[#181818] ${header.width} ${header.id === 'notes' ? 'hidden sm:table-cell' : ''}`} 
                    onClick={() => toggleSort(header.id)}
                >
                    <div className="flex items-center gap-1">
                        {header.label}
                        {sortBy === header.id && <span className="text-slate-900 dark:text-[#d8d8d8]">{sortIcon}</span>}
                    </div>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Table Body */}
      <div 
        ref={scrollRef}
        className="hide-scrollbar flex-1 overflow-y-auto bg-slate-50/40 p-1.5 dark:bg-[#101010] sm:bg-transparent sm:p-0"
      >
          {items.length === 0 && !loading ? (
             <div className="flex h-full flex-col items-center justify-center p-10 text-slate-400 dark:text-slate-600">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-4 h-16 w-16 opacity-50">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                 </svg>
                 <span className="font-medium text-lg">No transactions found</span>
                 <span className="text-sm opacity-70 mt-1">Try adjusting your filters or add a new one.</span>
             </div>
          ) : (
            <>
                {/* Mobile View */}
                <div className="block space-y-2.5 sm:hidden">
                    {items.map((item: any, i: number) => {
                         const dateObj = new Date(item.date);
                         const currentMonthYear = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                         
                         let showSeparator = false;
                         let monthlySubtotal = 0;
                         
                         if (sortBy === 'date') {
                           const prevItem = i > 0 ? items[i - 1] : null;
                           const prevMonthYear = prevItem ? new Date(prevItem.date).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : null;
                           
                           if (currentMonthYear !== prevMonthYear) {
                             showSeparator = true;
                             const serverSubtotal = monthlyNetByMonth?.[monthKey];
                             if (typeof serverSubtotal === 'number') {
                               monthlySubtotal = serverSubtotal;
                             } else {
                               for (let j = i; j < items.length; j++) {
                                 const subDateObj = new Date(items[j].date);
                                 if (subDateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) === currentMonthYear) {
                                   const isExp = items[j].type === 'Expense' || categoryMap[items[j].categoryId]?.type === 'Expense';
                                   const isInc = items[j].type === 'Income' || categoryMap[items[j].categoryId]?.type === 'Income';
                                   const amt = Number(items[j].amount) || 0;
                                   if (isExp) monthlySubtotal -= amt;
                                   if (isInc) monthlySubtotal += amt;
                                 } else {
                                   break;
                                 }
                               }
                             }
                           }
                         }

                        return (
                          <React.Fragment key={item.id}>
                            {showSeparator && (
                               <div className="-mx-1.5 mb-1 mt-2.5 flex justify-between border-y border-slate-200 bg-slate-100/85 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 first:mt-0 dark:border-[#2a2a2a] dark:bg-[#181818] dark:text-[#888]">
                                 <span>{currentMonthYear}</span>
                                 <span className={`lowercase tracking-normal text-[13px] ${monthlySubtotal > 0 ? 'text-emerald-500' : monthlySubtotal < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                   Net: <PrivacyNumber value={monthlySubtotal}>{monthlySubtotal > 0 ? '+' : ''}{formatEUR(monthlySubtotal)}</PrivacyNumber>
                                 </span>
                               </div>
                            )}
                            <MobileTransactionCard
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
                          </React.Fragment>
                        );
                    })}
                </div>

                {/* Desktop View */}
                <table className="hidden w-full table-fixed border-collapse sm:table">
                  <tbody className="text-slate-700 dark:text-[#bbb]">
                        {items.map((item: any, i: number) => {
                         const dateObj = new Date(item.date);
                         const currentMonthYear = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                         const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                         
                         let showSeparator = false;
                         let monthlySubtotal = 0;
                         
                         if (sortBy === 'date') {
                           const prevItem = i > 0 ? items[i - 1] : null;
                           const prevMonthYear = prevItem ? new Date(prevItem.date).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : null;
                           
                           if (currentMonthYear !== prevMonthYear) {
                             showSeparator = true;
                             const serverSubtotal = monthlyNetByMonth?.[monthKey];
                             if (typeof serverSubtotal === 'number') {
                               monthlySubtotal = serverSubtotal;
                             } else {
                               // Fallback to local page data if backend value is unavailable.
                               for (let j = i; j < items.length; j++) {
                                 const subDateObj = new Date(items[j].date);
                                 if (subDateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }) === currentMonthYear) {
                                   const isExp = items[j].type === 'Expense' || categoryMap[items[j].categoryId]?.type === 'Expense';
                                   const isInc = items[j].type === 'Income' || categoryMap[items[j].categoryId]?.type === 'Income';
                                   const amt = Number(items[j].amount) || 0;
                                   if (isExp) monthlySubtotal -= amt;
                                   if (isInc) monthlySubtotal += amt;
                                 } else {
                                   break;
                                 }
                               }
                             }
                           }
                         }

                         return [
                           showSeparator && (
                             <tr key={`separator-${item.id}`} className="border-y border-slate-200 bg-slate-100/80 dark:border-[#2a2a2a] dark:bg-[#181818]">
                               <td colSpan={4} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                 <div className="flex items-center justify-between">
                                   <span>{currentMonthYear}</span>
                                   <span className={`text-[13px] font-semibold lowercase tracking-normal ${monthlySubtotal > 0 ? 'text-emerald-600 dark:text-emerald-500' : monthlySubtotal < 0 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-400'}`}>
                                     Net: <PrivacyNumber value={monthlySubtotal}>{monthlySubtotal > 0 ? '+' : ''}{formatEUR(monthlySubtotal)}</PrivacyNumber>
                                   </span>
                                 </div>
                               </td>
                             </tr>
                           ),
                           <TransactionRow
                               key={`row-${item.id}`}
                               t={item}
                               isEven={i % 2 === 0}
                               selectionMode={selectionMode}
                               selectedIds={selectedIds}
                               toggleSelectItem={toggleSelectItem}
                               categoryMap={categoryMap}
                               setEditingId={setEditingId}
                               setForm={setForm}
                               setCategoryQuery={setCategoryQuery}
                               setShowModal={setShowModal}
                           />
                         ].filter(Boolean);
                        }).flat()}
                    </tbody>
                </table>
            </>
          )}
          
            <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-600">
            {loading ? (
                <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0s' }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.1s' }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0.2s' }}></div>
                </div>
            ) : (total !== undefined && items.length >= total && items.length > 0) ? (
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest opacity-60">
                <span className="h-px w-12 bg-slate-300 dark:bg-[#2a2a2a]"></span>
                    <span>End of list</span>
                <span className="h-px w-12 bg-slate-300 dark:bg-[#2a2a2a]"></span>
                </div>
            ) : null}
        </div>
      </div>
    </div>
  )
}
