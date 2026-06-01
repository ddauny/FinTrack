import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { formatEUR } from '@/lib/format';
import { PrivacyNumber } from '@/components/PrivacyNumber';

type AverageUnit = 'day' | 'week' | 'month';

interface SpendingEntry {
  type: string;
  amount: number;
}

interface CategoryEntry {
  category?: string;
  categoryName?: string;
  total: number;
}

interface AverageInsightsPanelProps {
  spending: SpendingEntry[];
  categoryAnalysis: CategoryEntry[];
  startDate: Date;
  endDate: Date;
  loading?: boolean;
  isCompareMode?: boolean;
}

const unitLabels: Record<AverageUnit, string> = {
  day: 'Per Day',
  week: 'Per Week',
  month: 'Per Month'
};

export const AverageInsightsPanel: React.FC<AverageInsightsPanelProps> = ({
  spending,
  categoryAnalysis,
  startDate,
  endDate,
  loading,
  isCompareMode
}) => {
  const [unit, setUnit] = useState<AverageUnit>('month');

  const rangeInfo = useMemo(() => {
    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).endOf('day');

    const dayCount = Math.max(1, end.diff(start, 'day') + 1);
    const weekCount = Math.max(1, dayCount / 7);
    const monthCount = Math.max(
      1,
      dayjs(endDate).startOf('month').diff(dayjs(startDate).startOf('month'), 'month') + 1
    );

    const divisor = unit === 'day' ? dayCount : unit === 'week' ? weekCount : monthCount;

    return {
      divisor,
      details:
        unit === 'day'
          ? `${dayCount} days in range`
          : unit === 'week'
            ? `${dayCount} days (${weekCount.toFixed(1)} weeks)`
            : `${monthCount} calendar months`
    };
  }, [startDate, endDate, unit]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const row of spending || []) {
      if (row.type === 'Income') income += Math.abs(Number(row.amount || 0));
      if (row.type === 'Expense') expense += Math.abs(Number(row.amount || 0));
    }

    return {
      income,
      expense,
      net: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0
    };
  }, [spending]);

  const categoryAverages = useMemo(() => {
    const normalized = (categoryAnalysis || [])
      .map((row) => ({
        name: row.category || row.categoryName || 'Uncategorized',
        total: Math.abs(Number(row.total || 0))
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);

    const top = normalized.slice(0, 6).map((row) => ({
      ...row,
      average: row.total / rangeInfo.divisor
    }));

    const maxAverage = top.length > 0 ? top[0].average : 0;
    const averagePerCategory =
      normalized.length > 0
        ? normalized.reduce((sum, row) => sum + row.total, 0) / normalized.length / rangeInfo.divisor
        : 0;

    return {
      top,
      maxAverage,
      averagePerCategory,
      categoryCount: normalized.length
    };
  }, [categoryAnalysis, rangeInfo.divisor]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111111] p-5 rounded-xl border border-slate-200 dark:border-[#1f1f1f]">
        <div className="h-6 w-40 bg-slate-100 dark:bg-[#171717] rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((id) => (
            <div key={id} className="h-20 rounded-xl bg-slate-100 dark:bg-[#171717] animate-pulse" />
          ))}
        </div>
        <div className="h-24 rounded-xl bg-slate-100 dark:bg-[#171717] animate-pulse" />
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-[#111111] p-5 rounded-xl border border-slate-200 dark:border-[#1f1f1f]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0]">Average Insights</h3>
          <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
            {rangeInfo.details}
            {isCompareMode ? ' • Compare mode enabled (current period only)' : ''}
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#151515] p-1">
          {(Object.keys(unitLabels) as AverageUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                unit === u
                  ? 'bg-slate-900 text-white dark:bg-[#eceff5] dark:text-slate-900'
                  : 'text-slate-500 dark:text-[#9a9a9a] hover:text-slate-700 dark:hover:text-[#d8d8d8]'
              }`}
            >
              {unitLabels[u]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Avg Expenses</p>
          <p className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            <PrivacyNumber value={totals.expense / rangeInfo.divisor}>{formatEUR(totals.expense / rangeInfo.divisor)}</PrivacyNumber>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Avg Income</p>
          <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            <PrivacyNumber value={totals.income / rangeInfo.divisor}>{formatEUR(totals.income / rangeInfo.divisor)}</PrivacyNumber>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Avg Net</p>
          <p className={`text-base sm:text-lg font-bold mt-1 ${totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            <PrivacyNumber value={totals.net / rangeInfo.divisor}>
              {(totals.net / rangeInfo.divisor) > 0 ? '+' : ''}{formatEUR(totals.net / rangeInfo.divisor)}
            </PrivacyNumber>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Avg Per Category</p>
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#f0f0f0] mt-1">
            <PrivacyNumber value={categoryAverages.averagePerCategory}>{formatEUR(categoryAverages.averagePerCategory)}</PrivacyNumber>
          </p>
          <p className="text-[10px] text-slate-400 dark:text-[#666] mt-0.5">
            {categoryAverages.categoryCount} categories
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-[#f0f0f0]">Top Category Averages</h4>
          <span className="text-[11px] text-slate-500 dark:text-[#888]">{unitLabels[unit]}</span>
        </div>

        {categoryAverages.top.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-[#666]">No category data in the selected range.</p>
        ) : (
          <div className="space-y-2.5">
            {categoryAverages.top.map((row) => {
              const width = categoryAverages.maxAverage > 0
                ? Math.max(8, (row.average / categoryAverages.maxAverage) * 100)
                : 0;

              return (
                <div key={row.name}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-[#d0d0d0] truncate">{row.name}</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-[#aaa] shrink-0">
                      <PrivacyNumber value={row.average}>{formatEUR(row.average)}</PrivacyNumber>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#232323] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-700 dark:bg-[#7f8ca3]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-500 dark:text-[#777]">
        Savings rate in range: <PrivacyNumber value={totals.savingsRate}>{totals.savingsRate.toFixed(1)}%</PrivacyNumber>
      </p>
    </section>
  );
};
