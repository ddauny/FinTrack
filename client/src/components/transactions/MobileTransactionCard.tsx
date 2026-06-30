import React from 'react';
import { memo } from 'react'
import { formatEUR, formatDateDMY } from '../../lib/format'
import { PrivacyNumber } from '../PrivacyNumber'
import { useLongPress } from '../../hooks/useLongPress'

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
  transaction, selectionMode, selectedIds, toggleSelectItem, categoryMap, setEditingId, setForm, setCategoryQuery, setShowModal,
}: MobileTransactionCardProps) {
  const t = transaction;
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
    <div 
      {...longPressProps} 
      className={`relative flex flex-col gap-2 p-4 mb-2 border border-slate-200 dark:border-[#1a1a1a] rounded-xl transition-all ${isSelected ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white dark:bg-[#0d0d0d] active:scale-[0.98]'}`}
      style={t.splitGroupId ? { borderLeft: `4px solid ${getSplitColor(t.splitGroupId)}` } : undefined}
    >
        <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <span className={`text-base font-black tabular-nums ${isInc ? 'text-emerald-600 dark:text-emerald-500' : isTrf ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-500'}`}>
                    <PrivacyNumber value={t.amount}>{formatEUR(t.amount)}</PrivacyNumber>
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{formatDateDMY(t.date)}</span>
                  {(t as any).recurringTransactionId && (
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400 shrink-0" title="Recurring transaction">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </span>
                  )}
                </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#222] rounded-lg shrink-0 max-w-[150px]">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: (t.category?.color || categoryMap[t.categoryId]?.color) || '#ccc' }} />
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter truncate">{t.category?.name || categoryMap[t.categoryId]?.name}</span>
            </div>
        </div>
        
        {t.notes && <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed border-l border-slate-200 dark:border-[#222] pl-3 py-1">{t.notes}</p>}
        
        <div className="flex items-center justify-between mt-1">
            <div className="flex gap-1">
                {t.tags?.slice(0,3).map((tag: any) => <span key={tag.id} className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-600">#{tag.name}</span>)}
            </div>
            <div className="flex items-center gap-2">
                {t.attachmentPath && <svg className="w-3 h-3 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-2.828-6.828l-6.414 6.586a6 6 0 008.485 8.485L17 13" /></svg>}
            </div>
        </div>
    </div>
  );
});
