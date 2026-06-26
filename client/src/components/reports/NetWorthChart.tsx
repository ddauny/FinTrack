import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { formatDateDMY, formatEUR } from '@/lib/format';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface NetWorthChartProps {
  data: any[];
  isDark: boolean;
  loading?: boolean;
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({ data, isDark, loading }) => {
  const { hideNumbers } = usePrivacy();
  const chartTextColor = isDark ? '#f5f5f5' : '#171717';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';

  const option = useMemo(() => ({
    textStyle: { fontFamily: 'Inter, sans-serif' },
    tooltip: {
      transitionDuration: 0, 
      trigger: 'axis', 
      backgroundColor: isDark ? '#141414' : '#ffffff', 
      borderColor: isDark ? '#141414' : '#e5e7eb', 
      textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
      formatter: (params: any) => {
        const val = hideNumbers ? '••••••' : formatEUR(params[0].value);
        return `<div class="font-bold mb-1">${params[0].axisValue}</div>
                <div class="flex items-center gap-2">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${params[0].color};"></span>
                  <span>Net Worth:</span>
                  <span class="font-mono font-medium">${val}</span>
                </div>`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: data.map(r => formatDateDMY(new Date(r.date))), 
      axisLabel: { color: chartTextColor }, 
      axisLine: { lineStyle: { color: axisLineColor } } 
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        color: chartTextColor,
        formatter: (val: number) => hideNumbers ? '•••' : `€${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`
      }, 
      splitLine: { lineStyle: { color: gridLineColor } } 
    },
    series: [{ 
      name: 'Net Worth', 
      type: 'line', 
      smooth: true, 
      showSymbol: false,
      data: data.map(r => r.net_worth), 
      itemStyle: { color: '#8b5cf6' }
    }]
  }), [data, isDark, chartTextColor, gridLineColor, axisLineColor, hideNumbers]);

  return (
    <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f] h-full">
      <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0] mb-4">Net Worth Evolution</h3>
       {loading ? (
        <div className="h-[300px] animate-pulse bg-slate-100 dark:bg-[#101010] rounded-xl"></div>
      ) : (
        <ReactECharts option={option} style={{ height: 300 }} />
      )}
    </div>
  );
};
