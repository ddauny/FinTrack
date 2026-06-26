import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { formatDateMonthYear } from '@/lib/format';

interface AllocationEntry {
  month: string;
  allocations: Record<string, number>;
}

interface AssetAllocationChangesChartProps {
  data: AllocationEntry[];
  isDark: boolean;
  hideNumbers: boolean;
  loading?: boolean;
}

export const AssetAllocationChangesChart: React.FC<AssetAllocationChangesChartProps> = ({ data, isDark, hideNumbers, loading }) => {
  const chartTextColor = isDark ? '#f5f5f5' : '#171717';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';

  const option = useMemo(() => {
    const months = data.map(d => d.month);
    const groupNames = Array.from(new Set(data.flatMap(d => Object.keys(d.allocations || {}))));
    const isSingle = months.length <= 1;

    return {
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: {
      transitionDuration: 0,
        trigger: 'axis',
        backgroundColor: isDark ? '#141414' : '#ffffff',
        borderColor: isDark ? '#141414' : '#e5e7eb',
        textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
        formatter: (params: any) => {
          const title = params?.[0]?.axisValue || '';
          let res = `<div class="font-bold mb-2">${title}</div>`;
          params.forEach((p: any) => {
            const val = hideNumbers ? '•••' : `${Number(p.value || 0).toFixed(1)}%`;
            res += `<div class="flex justify-between items-center gap-4 mb-1">
              <span class="flex items-center gap-1">${p.marker} ${p.seriesName}</span>
              <span class="font-mono font-medium">${val}</span>
            </div>`;
          });
          return res;
        }
      },
      legend: {
        top: 0,
        textStyle: { color: chartTextColor }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: months.map(m => formatDateMonthYear(new Date(`${m}-01`))),
        axisLabel: { color: chartTextColor },
        axisLine: { lineStyle: { color: axisLineColor } }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          color: chartTextColor,
          formatter: (val: number) => hideNumbers ? '•••' : `${val.toFixed(0)}%`
        },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      series: groupNames.map(name => ({
        name,
        type: isSingle ? 'bar' : 'line',
        stack: 'allocation',
        areaStyle: isSingle ? undefined : { opacity: 0.35 },
        showSymbol: isSingle,
        barWidth: isSingle ? 30 : undefined,
        data: data.map(d => Number(d.allocations?.[name] || 0))
      }))
    };
  }, [data, isDark, hideNumbers, chartTextColor, gridLineColor, axisLineColor]);

  return (
    <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f] h-full">
      <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0] mb-4">Allocation Mix Over Time</h3>
      {loading ? (
        <div className="h-[300px] animate-pulse bg-slate-100 dark:bg-[#101010] rounded-xl"></div>
      ) : (
        <ReactECharts option={option} style={{ height: 300 }} />
      )}
    </div>
  );
};
