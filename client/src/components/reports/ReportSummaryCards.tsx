import React, { useMemo } from 'react';
import { PrivacyNumber } from '../PrivacyNumber';
import { formatEUR } from '@/lib/format';

interface SpendingData {
  type: string;
  amount: number;
}

interface ReportSummaryCardsProps {
  isCompareMode: boolean;
  spending1: SpendingData[];
  spending2: SpendingData[];
  loading: boolean;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({
  isCompareMode,
  spending1,
  spending2,
  loading,
}) => {

  const calculateMetrics = (data: SpendingData[]) => {
    let income = 0;
    let expense = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let transfer = 0;
    
    data.forEach(item => {
      if (item.type === 'Income') income += Math.abs(item.amount);
      if (item.type === 'Expense') expense += Math.abs(item.amount);
      if (item.type === 'Transfer') transfer += Math.abs(item.amount);
    });

    const net = income - expense;
    const rate = income > 0 ? ((net / income) * 100) : 0;
    return { income, expense, transfer, net, rate };
  };

  const current = useMemo(() => calculateMetrics(spending1), [spending1]);
  const previous = useMemo(() => calculateMetrics(spending2), [spending2]);

  const cards = [
    { label: 'Income', value: current.income, prev: previous.income, baseColor: 'text-emerald-600 dark:text-emerald-400', isCurrency: true },
    { label: 'Expenses', value: current.expense, prev: previous.expense, baseColor: 'text-rose-600 dark:text-rose-400', isCurrency: true },
    { label: 'Net Result', value: current.net, prev: previous.net, baseColor: current.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400', isCurrency: true },
    { label: 'Savings Rate', value: current.rate, prev: previous.rate, baseColor: 'text-blue-600 dark:text-blue-400', isCurrency: false, suffix: '%' },
  ];

  const calculateDiff = (curr: number, prev: number) => {
    if (prev === 0) return { percent: 0, improved: true }; 
    const diff = ((curr - prev) / Math.abs(prev)) * 100;
    return { percent: diff, value: diff }; 
  };

  if (loading) {
     return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {[1,2,3,4].map(i => (
              <div key={i} className="bg-white dark:bg-[#111111] p-4 rounded-xl shadow-sm h-28 animate-pulse"></div>
           ))}
        </div>
     )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        let diffPercent = 0;
        let isImproved = true;
        let showDiff = isCompareMode;
        
        if (isCompareMode) {
             const d = calculateDiff(card.value, card.prev);
             diffPercent = d.percent;
             
             if (card.label === 'Expenses') {
                isImproved = diffPercent <= 0;
             } else {
                isImproved = diffPercent >= 0;
             }
        }

        return (
          <div key={card.label} className="bg-white dark:bg-[#111111] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-[#1f1f1f] flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#888] mb-1">
                {card.label}
              </p>
              <h3 className={`text-xl sm:text-2xl font-bold ${card.baseColor}`}>
                 <PrivacyNumber>
                    {card.isCurrency ? (
                        (card.label === 'Net Result' && card.value > 0 ? '+' : '') + formatEUR(card.value)
                    ) : (
                        `${card.value.toFixed(2)}${card.suffix || ''}`
                    )}
                 </PrivacyNumber>
              </h3>
            </div>
            
            {showDiff && (
                <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${isImproved ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {diffPercent > 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                        </svg>
                    ) : diffPercent < 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <span className="w-4 h-4 flex items-center justify-center font-bold text-slate-400">-</span>
                    )}
                    <span>{Math.abs(diffPercent).toFixed(1)}%</span>
                    <span className="text-slate-400 font-normal ml-1">vs prev</span>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
