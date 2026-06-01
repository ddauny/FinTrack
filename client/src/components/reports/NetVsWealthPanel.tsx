import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { PrivacyNumber } from '@/components/PrivacyNumber';
import { formatDateMonthYear, formatEUR } from '@/lib/format';

interface PeriodTotalEntry {
  type: string;
  amount: number;
}

interface NetWorthPoint {
  date: string;
  net_worth: number;
}

interface NetVsWealthPanelProps {
  spending: PeriodTotalEntry[];
  netWorthSeries: NetWorthPoint[];
  startDate: Date;
  endDate: Date;
  loading?: boolean;
}

export const NetVsWealthPanel: React.FC<NetVsWealthPanelProps> = ({
  spending,
  netWorthSeries,
  startDate,
  endDate,
  loading
}) => {
  const insights = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const row of spending || []) {
      if (row.type === 'Income') income += Math.abs(Number(row.amount || 0));
      if (row.type === 'Expense') expense += Math.abs(Number(row.amount || 0));
    }

    const net = income - expense;

    const points = [...(netWorthSeries || [])]
      .map((p) => ({
        ...p,
        net_worth: Number(p.net_worth || 0),
        monthKey: dayjs(p.date).format('YYYY-MM')
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const baselineMonthKey = dayjs(startDate).startOf('month').subtract(1, 'month').format('YYYY-MM');
    const endMonthKey = dayjs(endDate).endOf('month').format('YYYY-MM');

    const byMonth = new Map(points.map((p) => [p.monthKey, p]));

    const getPointOnOrBefore = (targetKey: string) => {
      const candidates = points.filter((p) => p.monthKey <= targetKey);
      return candidates.length > 0 ? candidates[candidates.length - 1] : null;
    };

    const first = byMonth.get(baselineMonthKey) || getPointOnOrBefore(baselineMonthKey);
    const last = byMonth.get(endMonthKey) || getPointOnOrBefore(endMonthKey);

    if (!first || !last) {
      return {
        net,
        hasAssetsData: false,
        startValue: 0,
        endValue: 0,
        wealthDelta: 0,
        variance: 0,
        firstDate: null as Date | null,
        lastDate: null as Date | null,
        baselineMonthKey,
        endMonthKey
      };
    }

    const startValue = first.net_worth;
    const endValue = last.net_worth;
    const wealthDelta = endValue - startValue;
    const variance = wealthDelta - net;

    return {
      net,
      hasAssetsData: points.length >= 2 && new Date(last.date).getTime() >= new Date(first.date).getTime(),
      startValue,
      endValue,
      wealthDelta,
      variance,
      firstDate: new Date(first.date),
      lastDate: new Date(last.date),
      baselineMonthKey,
      endMonthKey
    };
  }, [spending, netWorthSeries, startDate, endDate]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111111] p-5 rounded-xl border border-slate-200 dark:border-[#1f1f1f]">
        <div className="h-6 w-56 bg-slate-100 dark:bg-[#171717] rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((id) => (
            <div key={id} className="h-20 rounded-xl bg-slate-100 dark:bg-[#171717] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const varianceAbs = Math.abs(insights.variance);
  const isAligned = varianceAbs < 1;

  const varianceLabel = isAligned
    ? 'Aligned'
    : insights.variance > 0
      ? 'Wealth growth above net'
      : 'Wealth growth below net';

  const varianceColor = isAligned
    ? 'text-emerald-600 dark:text-emerald-400'
    : insights.variance > 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <section className="bg-white dark:bg-[#111111] p-5 rounded-xl border border-slate-200 dark:border-[#1f1f1f]">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0]">Net vs Wealth Change</h3>
        <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
          Wealth delta is measured from previous month-end baseline to selected period end (e.g. Feb-Mar uses Jan → Mar).
        </p>
      </div>

      {!insights.hasAssetsData ? (
        <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-4">
          <p className="text-sm text-slate-600 dark:text-[#aaa]">
            At least two wealth snapshots are required (baseline month and end month) to compute this comparison.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Period Net</p>
              <p className={`text-base sm:text-lg font-bold mt-1 ${insights.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <PrivacyNumber value={insights.net}>{insights.net > 0 ? '+' : ''}{formatEUR(insights.net)}</PrivacyNumber>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Wealth Delta</p>
              <p className={`text-base sm:text-lg font-bold mt-1 ${insights.wealthDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <PrivacyNumber value={insights.wealthDelta}>{insights.wealthDelta > 0 ? '+' : ''}{formatEUR(insights.wealthDelta)}</PrivacyNumber>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-[#888] font-semibold">Variance</p>
              <p className={`text-base sm:text-lg font-bold mt-1 ${varianceColor}`}>
                <PrivacyNumber value={insights.variance}>{insights.variance > 0 ? '+' : ''}{formatEUR(insights.variance)}</PrivacyNumber>
              </p>
              <p className={`text-[11px] mt-1 font-semibold ${varianceColor}`}>{varianceLabel}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#222] bg-slate-50 dark:bg-[#151515] p-3 text-xs text-slate-600 dark:text-[#aaa]">
            <p>
              Wealth from{' '}
              <span className="font-semibold text-slate-800 dark:text-[#ddd]">
                <PrivacyNumber value={insights.startValue}>{formatEUR(insights.startValue)}</PrivacyNumber>
              </span>
              {' '}to{' '}
              <span className="font-semibold text-slate-800 dark:text-[#ddd]">
                <PrivacyNumber value={insights.endValue}>{formatEUR(insights.endValue)}</PrivacyNumber>
              </span>
              {' '}({insights.firstDate ? formatDateMonthYear(insights.firstDate) : '-'} → {insights.lastDate ? formatDateMonthYear(insights.lastDate) : '-'}).
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-[#888]">
              Baseline month: {insights.baselineMonthKey ?? '-'} • End month: {insights.endMonthKey ?? '-'}
            </p>
          </div>
        </>
      )}
    </section>
  );
};
