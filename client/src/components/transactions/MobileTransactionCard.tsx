import React from 'react';
import { memo } from 'react'
import { formatEUR, formatDateDMY } from '../../lib/format'
import { PrivacyNumber } from '../PrivacyNumber'
import { useLongPress } from '../../hooks/useLongPress'

interface MobileTransactionCardProps {
  transaction: any
  selectionMode: boolean
  selectedIds: Set<number>
  toggleSelectItem: (id: number) => void
  categoryMap: Record<number, any>
  setEditingId: (id: number) => void
  setForm: (form: any) => void
  setCategoryQuery: (q: string) => void
  setShowModal: (show: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItems?: any
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setTotal?: any
}

export const MobileTransactionCard = memo(function MobileTransactionCard({ 
  transaction, 
  selectionMode, 
  selectedIds, 
  toggleSelectItem, 
  categoryMap,
  setEditingId,
  setForm,
  setCategoryQuery,
  setShowModal,
}: MobileTransactionCardProps) {
  const t = transaction;

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
  const isExpense = !isIncome && !isTransfer

  return (
    <div 
      {...longPressProps}
      className={`
        relative overflow-hidden
        bg-white dark:bg-[#111111] backdrop-blur-sm
        p-3 rounded-lg shadow-sm border border-slate-100 dark:border-[#1f1f1f] 
        select-none cursor-pointer transition-all duration-200
        active:scale-[0.98]
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600'}
      `}
    >
      <div className="flex flex-col gap-2">
        {/* Top Row: Date and Amount */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#888] uppercase tracking-wide">{formatDateDMY(t.date)}</span>
            <span className="text-[10px] text-slate-400 dark:text-[#666] mt-0">
                {new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
          </div>
          
          <div className={`text-base sm:text-lg font-bold flex items-center gap-1.5 ${
            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 
            isTransfer ? 'text-blue-600 dark:text-blue-400' :
            'text-rose-600 dark:text-rose-400'
          }`}>
            <PrivacyNumber value={t.amount}>
              {formatEUR(t.amount)}
            </PrivacyNumber>
            {t.attachmentPath && (
               <div className="p-1 rounded-full bg-slate-100 dark:bg-[#111111] text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                  </svg>
               </div>
            )}
          </div>
        </div>

        {/* Middle Row: Category and Recurring Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-[#101010]/50 rounded-lg">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: (t.category?.color || categoryMap[t.categoryId]?.color) || '#64748b' }}></div>
            <span className="text-xs font-bold text-slate-700 dark:text-[#d8d8d8]">
              {t.category?.name || categoryMap[t.categoryId]?.name || t.categoryId}
            </span>
          </div>
          {(t as any).recurringTransactionId && (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-md text-yellow-700 dark:text-yellow-400 text-[10px] font-bold uppercase tracking-wide">
              Recurring
            </div>
          )}
        </div>

        {/* Tags Row */}
        {t.tags && t.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {t.tags.map((tag: any) => (
              <span key={tag.id} className="text-blue-600 dark:text-blue-400 text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Bottom Row: Notes */}
        {t.notes && (
          <div className="text-xs sm:text-sm text-slate-500 dark:text-[#888] italic truncate pl-1 border-l-2 border-slate-200 dark:border-[#1f1f1f]">
            {t.notes}
          </div>
        )}
      </div>
      
      {/* Selection Checkmark */}
      {isSelected && (
        <div className="absolute top-0 right-0 p-1.5 bg-blue-500 rounded-bl-xl text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        </div>
      )}
    </div>
  );
});
