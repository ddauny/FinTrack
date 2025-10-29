import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEUR } from '@/lib/format';
import type { Budget } from '../types';

export function BudgetsPage() {
  const [items, setItems] = useState<Budget[]>([]);
  
  useEffect(() => {
    api.budgets.list().then((data) => setItems(data as Budget[]));
  }, []);
  
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="font-semibold mb-4">Budgets</div>
      <div className="space-y-3">
        {items.map((b: Budget) => {
          const pct = Math.min(100, Math.round((Number(b.spent || 0) / Number(b.amount || 1)) * 100));
          return (
            <div key={b.id} className="border rounded p-3">
              <div className="flex justify-between text-sm mb-2">
                <div>{b.period} - Category #{b.categoryId}</div>
                <div>{formatEUR(b.spent || 0)} / {formatEUR(b.amount)}</div>
              </div>
              <div className="w-full bg-gray-200 rounded h-3">
                <div 
                  className={`h-3 rounded ${pct > 100 ? 'bg-red-600' : 'bg-green-600'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}