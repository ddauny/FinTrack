import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { formatDateMonthYear, formatEUR } from '@/lib/format';

interface AssetGroupComparisonChartProps {
  data: { months: string[]; series: { name: string; data: number[] }[] } | null;
  isDark: boolean;
  hideNumbers: boolean;
  loading?: boolean;
}

export const AssetGroupComparisonChart: React.FC<AssetGroupComparisonChartProps> = ({ data, isDark, hideNumbers, loading }) => {
  const chartTextColor = isDark ? '#f5f5f5' : '#171717';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';

  const option = useMemo(() => {
    const months = data?.months || [];
    const series = data?.series || [];

    return {
      textStyle: { fontFamily: 'Inter, sans-serif' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#141414' : '#ffffff',
        borderColor: isDark ? '#141414' : '#e5e7eb',
        textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
        formatter: (params: any) => {
          const title = params?.[0]?.axisValue || '';
          let res = `<div class="font-bold mb-2">${title}</div>`;
          params.forEach((p: any) => {
            const val = hideNumbers ? '••••••' : formatEUR(p.value);
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
        axisLabel: {
          color: chartTextColor,
          formatter: (val: number) => hideNumbers ? '•••' : `€${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
        },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      series: series.map(s => ({
        name: s.name,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: s.data,
        lineStyle: { width: 2 }
      }))
    };
  }, [data, isDark, hideNumbers, chartTextColor, gridLineColor, axisLineColor]);

  return (
    <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f] h-full">
      <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0] mb-4">Asset Group Comparison</h3>
      {loading ? (
        <div className="h-[300px] animate-pulse bg-slate-100 dark:bg-[#101010] rounded-xl"></div>
      ) : (
        <ReactECharts option={option} style={{ height: 300 }} />
      )}
    </div>
  );
};
