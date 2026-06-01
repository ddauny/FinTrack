import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatEUR } from '../lib/format';
import type { Budget } from '../types';

export function BudgetsPage() {
  const [items, setItems] = useState<Budget[]>([]);
  
  useEffect(() => {
    api.budgets.list().then((data) => setItems(data as Budget[]));
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090909] p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 dark:text-[#f0f0f0] mb-6">Budgets</h1>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <p className="text-sm font-medium">No budgets configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((b: Budget) => {
              const pct = Math.min(100, Math.round((Number(b.spent || 0) / Number(b.amount || 1)) * 100));
              const isOver = pct >= 100;
              const isWarning = pct >= 80;
              return (
                <div key={b.id} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-[#888] uppercase tracking-wider mb-0.5">{b.period}</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-[#f0f0f0]">Category #{b.categoryId}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-bold ${isOver ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {formatEUR(b.spent || 0)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#888]">of {formatEUR(b.amount)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-700 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${
                    isOver ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-slate-400 dark:text-[#666]'
                  }`}>{pct}% used</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}