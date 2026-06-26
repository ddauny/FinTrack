import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { formatEUR, formatDateDMY } from '@/lib/format';

// --- Shared Types ---
interface ChartProps {
  data: any[];
  hideNumbers: boolean;
  isDark: boolean;
  onDrillDown?: (params: any) => void;
  loading?: boolean;
}

// --- Cash Flow Chart ---
interface CashFlowChartProps extends ChartProps {
  // If we want to support comparison in cashflow later, we can add props here
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, hideNumbers, isDark, onDrillDown, loading }) => {
  const chartTextColor = isDark ? '#f5f5f5' : '#171717';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)';

  const option = useMemo(() => ({
    textStyle: { fontFamily: 'Inter, sans-serif' },
    tooltip: {
      transitionDuration: 0,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: isDark ? '#141414' : '#ffffff',
      borderColor: isDark ? '#141414' : '#e5e7eb',
      textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
      formatter: (params: any) => {
        let res = `<div class="font-bold mb-2">${params[0].axisValue}</div>`;
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
       data: ['Income', 'Expenses', 'Net Result'],
       textStyle: { color: chartTextColor },
       bottom: 0
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(item => formatDateDMY(new Date(item.period + '-01'))),
      axisLine: { lineStyle: { color: axisLineColor } },
      axisLabel: { color: chartTextColor }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLabel: {
         color: chartTextColor,
         formatter: (val: number) => hideNumbers ? '•••' : `€${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`
      }
    },
    series: [
      {
        name: 'Income',
        type: 'bar',
        data: data.map(item => item.income),
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30
      },
      {
        name: 'Expenses',
        type: 'bar',
        data: data.map(item => Math.abs(item.expense)), // Show as positive for comparison (note: raw data is 'expense' singular in endpoint)
        itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30
      },
      {
        name: 'Net Result',
        type: 'line',
        data: data.map(item => item.net),
        itemStyle: { color: '#3b82f6' },
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 3 }
      }
    ]
  }), [data, hideNumbers, isDark, chartTextColor, gridLineColor, axisLineColor]);

  const onChartClick = (params: any) => {
     if (onDrillDown && params.name) {
         onDrillDown(params);
     }
  };

  return (
    <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f] h-full">
      <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0] mb-4">Cash Flow History</h3>
      {loading ? (
        <div className="h-[350px] animate-pulse bg-slate-100 dark:bg-[#101010] rounded-xl"></div>
      ) : (
        <ReactECharts 
            option={option} 
            style={{ height: 350 }} 
            onEvents={{ 'click': onChartClick }}
        />
      )}
    </div>
  );
};


// --- Category Breakdown Chart ---
interface CategoryBreakdownProps extends ChartProps {
   data2?: any[]; // For comparison
   isCompareMode?: boolean;
}

export const CategoryBreakdownChart: React.FC<CategoryBreakdownProps> = ({ 
    data, data2, isCompareMode, hideNumbers, isDark, onDrillDown, loading 
}) => {
    const chartTextColor = isDark ? '#f5f5f5' : '#171717';
    const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';

    // Helper to process data
    const processData = (rawData: any[]) => {
       return rawData
         .map(item => ({ value: Number(item.total), name: item.category, id: item.categoryId }))
         .sort((a, b) => b.value - a.value); // Descending order
    };

    const seriesData1 = useMemo(() => processData(data), [data]);
    const seriesData2 = useMemo(() => data2 ? processData(data2) : [], [data2]);

    // OPTION 1: Pie Chart (Single Mode)
    const pieOption = useMemo(() => ({
       textStyle: { fontFamily: 'Inter, sans-serif' },
       tooltip: {
      transitionDuration: 0,
         trigger: 'item',
         backgroundColor: isDark ? '#141414' : '#ffffff',
         borderColor: isDark ? '#141414' : '#e5e7eb',
         textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
         formatter: (params: any) => {
            const val = hideNumbers ? '••••' : formatEUR(params.value);
            return `<div class="font-medium">${params.name}</div><div class="text-sm text-slate-500">${val} (${params.percent}%)</div>`;
         }
       },
       legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 20,
          top: 'middle',
          textStyle: { color: chartTextColor, fontSize: 13 },
          itemWidth: 14,
          itemHeight: 14,
          itemGap: 12,
          formatter: (name: string) => name.length > 18 ? name.slice(0, 16) + '...' : name
       },
       series: [
          {
             name: 'Expenses',
             type: 'pie',
             radius: ['50%', '80%'], // Increased size
             center: ['40%', '50%'], // Adjusted center
             avoidLabelOverlap: true,
             itemStyle: {
                borderRadius: 5,
                borderColor: isDark ? '#141414' : '#ffffff',
                borderWidth: 2
             },
             label: { show: false },
             emphasis: {
                scale: true,
                scaleSize: 10,
                itemStyle: {
                   shadowBlur: 10,
                   shadowOffsetX: 0,
                   shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
             },
             data: seriesData1
          }
       ]
    }), [seriesData1, isDark, chartTextColor, hideNumbers]);

    // OPTION 2: Bar Chart (Compare Mode)
    const barOption = useMemo(() => {
        // 1. Get Union of all categories
        const allCategories = Array.from(new Set([
            ...seriesData1.map(i => i.name),
            ...seriesData2.map(i => i.name)
        ]));

        // 2 Sort: We want top spenders at the top of the chart? Or bottom?
        // Echarts bar chart: index 0 is at bottom usually unless inverse=true
        // We'll sort by value in period 1
        const map1 = new Map(seriesData1.map(i => [i.name, i.value]));
        const map2 = new Map(seriesData2.map(i => [i.name, i.value]));

        allCategories.sort((a, b) => (map1.get(a) || 0) - (map1.get(b) || 0));

        const data1Sorted = allCategories.map(c => map1.get(c) || 0);
        const data2Sorted = allCategories.map(c => map2.get(c) || 0);

        return {
           textStyle: { fontFamily: 'Inter, sans-serif' },
           tooltip: {
      transitionDuration: 0,
             trigger: 'axis',
             axisPointer: { type: 'shadow' },
             backgroundColor: isDark ? '#141414' : '#ffffff',
             borderColor: isDark ? '#141414' : '#e5e7eb',
             textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
             formatter: (params: any) => {
                let res = `<div class="font-bold mb-1">${params[0].name}</div>`;
                params.forEach((p: any) => {
                    const val = hideNumbers ? '••••' : formatEUR(p.value);
                    res += `<div class="flex justify-between items-center gap-4">
                        <span class="flex items-center gap-1">${p.marker} ${p.seriesName}</span>
                        <span class="font-mono">${val}</span>
                    </div>`;
                });
                return res;
            }
           },
           legend: {
              data: ['Current Period', 'Previous Period'],
              textStyle: { color: chartTextColor },
              top: 0
           },
           grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
           xAxis: {
              type: 'value',
              splitLine: { lineStyle: { color: gridLineColor } },
              axisLabel: { 
                 color: chartTextColor,
                 formatter: (val: number) => hideNumbers ? '•••' : val >= 1000 ? (val/1000).toFixed(0)+'k' : val
              }
           },
           yAxis: {
              type: 'category',
              data: allCategories,
              axisLabel: { color: chartTextColor }
           },
           series: [
              {
                 name: 'Current Period',
                 type: 'bar',
                 data: data1Sorted,
                 itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
                 barMaxWidth: 20
              },
              {
                 name: 'Previous Period',
                 type: 'bar',
                 data: data2Sorted,
                 itemStyle: { color: '#94a3b8', borderRadius: [0, 4, 4, 0], opacity: 0.5 },
                 barMaxWidth: 20
              }
           ]
        };
    }, [seriesData1, seriesData2, isDark, chartTextColor, gridLineColor, hideNumbers]);

    const onChartClick = (params: any) => {
        // Find category ID
        const matched = seriesData1.find(i => i.name === params.name) || seriesData2.find(i => i.name === params.name);
        if (matched && onDrillDown) {
            onDrillDown({ categoryId: matched.id, name: matched.name });
        }
    };

    return (
       <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f] h-full">
         <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0]">Expense Breakdown</h3>
         </div>
         {loading ? (
             <div className="h-[350px] animate-pulse bg-slate-100 dark:bg-[#101010] rounded-xl"></div>
         ) : (
            <div className="relative h-[350px]">
                {(!seriesData1.length && !isCompareMode) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2 opacity-30">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                        </svg>
                        <p className="text-sm font-medium">No expenses found</p>
                    </div>
                ) : (
                    <ReactECharts 
                        option={isCompareMode ? barOption : pieOption} 
                        style={{ height: '100%' }} 
                        onEvents={{ 'click': onChartClick }}
                    />
                )}
            </div>
         )}
       </div>
    );
}
