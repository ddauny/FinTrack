import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useThemeContext } from '@/contexts/ThemeContext'

export function DashboardPage() {
  const navigate = useNavigate()
  const { hideNumbers } = usePrivacy()
  const { resolved } = useThemeContext()
  const [data, setData] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const handleMonthlyExpensesClick = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    
    // Format YYYY-MM-DD using local time
    const formatDate = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }
    
    navigate(`/transactions?startDate=${formatDate(start)}&endDate=${formatDate(end)}&type=Expense`)
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    api.dashboardSummary().then(setData).catch((error) => {
      console.error('Error loading dashboard data:', error);
      setData({ 
        netWorth: 0, 
        cashFlowLast30Days: 0, 
        recentTransactions: [], 
        netWorthHistory: [], 
        assetAllocation: [], 
        expenseBreakdown: [] 
      });
    })
  }, [])

  const startIndex = isMobile ? Math.max(0, (data?.netWorthHistory?.length || 0) - 7) : 0;
  const lineOption = useMemo(() => {
    if (!data) return {};
    return {
    backgroundColor: 'transparent',
    textStyle: {
      color: resolved === 'dark' ? '#e8e8e8' : '#141414'
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '10%',
      top: '10%',
      containLabel: true
    },
    dataZoom: isMobile ? [
      {
        type: 'inside',
        startValue: Math.max(0, (data.netWorthHistory?.length || 0) - 7),
        endValue: (data.netWorthHistory?.length || 0) - 1,
        zoomLock: false
      }
    ] : [],
    xAxis: { 
      type: 'category', 
      data: data.netWorthHistory?.map((d:any)=> new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })) ?? [],
      axisLabel: {
        color: resolved === 'dark' ? '#666666' : '#666666',
        rotate: 0,
        fontSize: 10,
        interval: 'auto'
      }
    },
    yAxis: { 
      type: 'value',
      scale: true,
      axisLabel: {
        formatter: (value: number) => {
          if (hideNumbers) return '••••••';
          if (value >= 1000) return `€${(value/1000).toFixed(0)}k`;
          return `€${value}`;
        },
        color: resolved === 'dark' ? '#666666' : '#666666',
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          color: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0'
        }
      }
    },
    tooltip: { 
      trigger: 'axis',
      backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
      borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
      textStyle: {
        color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f'
      },
      borderRadius: 12,
      padding: 12,
      extraCssText: 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);',
      formatter: (params: any) => {
        if (hideNumbers) {
          return `<div class="font-bold mb-1">${params[0].name}</div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Net Worth: ••••••</div>`
        }
        return `<div class="font-bold mb-1">${params[0].name}</div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Net Worth: <span class="font-mono font-bold">${formatEUR(params[0].value)}</span></div>`
      },
      confine: true
    },
    series: [{
      type: 'line',
      symbolSize: 6,
      smooth: 0.3,
      lineStyle: {
        color: resolved === 'dark' ? '#3b82f6' : '#2563eb',
        width: 2.5
      },
      areaStyle: {
        color: resolved === 'dark'
          ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{offset: 0, color: 'rgba(59,130,246,0.18)'},{offset: 1, color: 'rgba(59,130,246,0)'}] }
          : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{offset: 0, color: 'rgba(37,99,235,0.10)'},{offset: 1, color: 'rgba(37,99,235,0)'}] }
      },
      itemStyle: {
        color: resolved === 'dark' ? '#3b82f6' : '#2563eb',
        borderWidth: 2,
        borderColor: resolved === 'dark' ? '#1d4ed8' : '#1e40af'
      },
      data: data.netWorthHistory?.map((d:any, index: number) => ({
        value: d.value,
        label: {
          show: !(isMobile && index === startIndex),
          position: index % 2 === 0 ? 'top' : 'bottom',
          formatter: () => {
            if (hideNumbers) return '••••••';
            if (isMobile) {
              if (Math.abs(d.value) >= 1000000) return '€' + (d.value / 1000000).toFixed(2) + 'm';
              if (Math.abs(d.value) >= 1000) return '€' + (d.value / 1000).toFixed(1) + 'k';
              return '€' + d.value.toFixed(0);
            }
            return formatEUR(d.value);
          },
          fontSize: 10,
          color: resolved === 'dark' ? '#e8e8e8' : '#141414',
          distance: 5
        }
      })) ?? []
    }]
  };
  }, [resolved, data, hideNumbers, isMobile, startIndex]);

  const donutOption = useMemo(() => {
    if (!data) return {};
    return {
    backgroundColor: 'transparent',
    textStyle: {
      color: resolved === 'dark' ? '#e8e8e8' : '#141414'
    },
    color: resolved === 'dark' ? ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] : ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'],
    tooltip: { 
      trigger: 'item',
      backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
      borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
      textStyle: { color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f' },
      borderRadius: 12,
      padding: 12,
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
      formatter: (params: any) => {
        const val = hideNumbers ? '••••••' : formatEUR(params.value);
        return `<div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center;">
              ${params.marker}
              <span style="margin-left: 4px;">Value</span>
            </span>
            <span style="font-weight: bold; margin-left: 12px;">${val}</span>
          </div>
          <div style="margin-top: 4px; font-size: 0.9em; color: ${resolved === 'dark' ? '#666666' : '#666666'}">
            ${params.percent}% of total
          </div>`;
      },
      confine: true
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: {
        color: resolved === 'dark' ? '#e8e8e8' : '#141414',
        fontSize: 10
      },
      type: 'scroll'
    },
    series: [{
      type: 'pie', 
      radius: isMobile ? ['35%', '55%'] : ['40%','65%'],
      center: ['50%', '45%'],
      data: (data.assetAllocation||[]).map((a:any)=>({ 
        name: a.class, 
        value: Number(a.value).toFixed(2) // Limit to 2 decimal places
      })),
      label: {
        fontSize: 10,
        color: resolved === 'dark' ? '#e8e8e8' : '#141414',
        show: !isMobile
      }
    }]
  };
  }, [resolved, data, hideNumbers, isMobile]);

  const barOption = useMemo(() => {
    if (!data) return {};
    return {
    backgroundColor: 'transparent',
    textStyle: {
      color: resolved === 'dark' ? '#e8e8e8' : '#141414'
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '3%',
      bottom: '3%',
      containLabel: true
    },
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
      borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
      textStyle: { color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f' },
      borderRadius: 12,
      padding: 12,
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
      formatter: (params: any) => {
        const data = params[0];
        const val = hideNumbers ? '••••••' : formatEUR(data.value);
        return `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center;">
              ${data.marker}
              <span style="margin-left: 4px;">Total</span>
            </span>
            <span style="font-weight: bold; margin-left: 12px;">${val}</span>
          </div>`;
      },
      confine: true
    },
    xAxis: { 
      type: 'category', 
      data: (data.expenseBreakdown||[]).map((e:any)=>e.category),
      axisLabel: {
        show: true,
        interval: 'auto',
        rotate: 45,
        fontSize: 10,
        color: resolved === 'dark' ? '#666666' : '#666666'
      },
      axisLine: {
        lineStyle: {
          color: resolved === 'dark' ? '#282828' : '#666666'
        }
      }
    },
    yAxis: { 
      type: 'log',
      axisLabel: {
        formatter: (value: number) => {
          if (hideNumbers) return '••••••';
          if (value >= 1000) return `€${(value/1000).toFixed(0)}k`;
          return `€${value}`;
        },
        fontSize: 10,
        color: resolved === 'dark' ? '#666666' : '#666666'
      },
      splitLine: {
        lineStyle: {
          color: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0'
        }
      }
    },
    series: [{ 
      type: 'bar', 
      data: (data.expenseBreakdown||[]).map((e:any)=>e.total), 
      itemStyle: { 
        color: resolved === 'dark' ? '#ef4444' : '#dc2626'
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          if (hideNumbers) return '••••••';
          const val = params.value;
          if (val >= 1000) return `€${(val/1000).toFixed(1)}k`;
          return `€${val.toFixed(0)}`;
        },
        fontSize: 9,
        color: resolved === 'dark' ? '#e8e8e8' : '#141414'
      }
    }]
  };
  }, [resolved, data, hideNumbers]);

  const savingsRateOption = useMemo(() => {
    if (!data) return {};
    const history = (data.monthlyCashFlowHistory || []).map((d: any) => ({
      label: (() => { const [y, m] = d.month.split('-'); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); })(),
      rate: d.income > 0 ? Math.round(((d.income - d.expense) / d.income) * 100) : 0,
    }));
    const posColor = resolved === 'dark' ? '#34d399' : '#059669';
    const negColor = resolved === 'dark' ? '#f87171' : '#dc2626';
    return {
      backgroundColor: 'transparent',
      textStyle: { color: resolved === 'dark' ? '#e8e8e8' : '#141414' },
      grid: { left: '3%', right: '3%', top: '8%', bottom: '12%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
        borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
        textStyle: { color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f' },
        borderRadius: 12,
        padding: 12,
        formatter: (params: any) => {
          const val = hideNumbers ? '••%' : `${params[0].value}%`;
          return `<div style="font-weight:bold;margin-bottom:4px">${params[0].name}</div><div>Savings Rate: <b>${val}</b></div>`;
        },
        confine: true,
      },
      xAxis: {
        type: 'category',
        data: history.map((d: any) => d.label),
        axisLabel: { color: resolved === 'dark' ? '#666666' : '#666666', fontSize: 10 },
        axisLine: { lineStyle: { color: resolved === 'dark' ? '#282828' : '#666666' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => hideNumbers ? '••%' : `${v}%`,
          color: resolved === 'dark' ? '#666666' : '#666666',
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0' } },
      },
      series: [{
        type: 'bar',
        data: history.map((d: any) => ({
          value: d.rate,
          itemStyle: { color: d.rate >= 0 ? posColor : negColor, borderRadius: d.rate >= 0 ? [4,4,0,0] : [0,0,4,4] },
        })),
        barMaxWidth: 28,
      }],
    };
  }, [resolved, data, hideNumbers]);

  if (!data) return (
    <div className="p-3 space-y-3 h-[calc(100vh-52px)] overflow-hidden flex flex-col animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-[#1f1f1f] divide-x divide-slate-200 dark:divide-[#1f1f1f] bg-white dark:bg-[#111111] rounded-lg shrink-0">
        {[1,2,3,4].map(i => (
          <div key={i} className="p-5 h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 flex-1 min-h-0">
        <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-3 xl:grid-rows-[1fr_1fr]">
          <div className="xl:col-span-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />
        </div>
        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg" />
      </div>
    </div>
  );

  return (
    <div className="p-3 space-y-3 lg:h-[calc(100vh-52px)] lg:overflow-hidden flex flex-col page-enter">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:min-h-full lg:grid-rows-[auto_1fr]">

        {/* ── Metric strip ── */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-200 dark:divide-[#1f1f1f] border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] rounded-lg shrink-0 overflow-hidden">

          {/* Net Worth */}
          <div className="p-4 lg:p-5">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#555] uppercase tracking-widest mb-2">Net Worth</p>
            <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-[#f0f0f0] tabular-nums leading-none">
              <PrivacyNumber value={data.netWorth}>{formatEUR(data.netWorth)}</PrivacyNumber>
            </div>
            {data.netWorthGrowth !== null && data.netWorthGrowth !== undefined && (
              <div className={`flex items-center mt-2 text-xs font-semibold ${data.netWorthGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.netWorthGrowth >= 0 ? '▲' : '▼'} {Math.abs(data.netWorthGrowth).toFixed(1)}%
                <span className="text-slate-400 dark:text-[#555] ml-1.5 font-normal">vs last month</span>
              </div>
            )}
          </div>

          {/* Cash Flow */}
          <div className="p-4 lg:p-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#161616] transition-colors" onClick={() => navigate('/monthly-summary')}>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#555] uppercase tracking-widest mb-2">Cash Flow</p>
            <div className={`text-xl lg:text-2xl font-bold tabular-nums leading-none ${(data.cashFlowLast30Days||0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <PrivacyNumber value={data.cashFlowLast30Days||0}>{formatEUR(data.cashFlowLast30Days||0)}</PrivacyNumber>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#555] mt-2">Current month</p>
          </div>

          {/* Monthly Expenses */}
          <div className="p-4 lg:p-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#161616] transition-colors" onClick={handleMonthlyExpensesClick}>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#555] uppercase tracking-widest mb-2">Monthly Expenses</p>
            <div className="text-xl lg:text-2xl font-bold text-rose-400 tabular-nums leading-none">
              <PrivacyNumber value={data.monthlyExpenses||0}>{formatEUR(data.monthlyExpenses||0)}</PrivacyNumber>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#555] mt-2">Current month</p>
          </div>

          {/* Monthly Income */}
          <div className="p-4 lg:p-5">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#555] uppercase tracking-widest mb-2">Monthly Income</p>
            <div className="text-xl lg:text-2xl font-bold text-emerald-400 tabular-nums leading-none">
              <PrivacyNumber value={data.monthlyIncome||0}>{formatEUR(data.monthlyIncome||0)}</PrivacyNumber>
            </div>
            {(data.monthlyIncome||0) > 0 && (data.monthlyExpenses||0) > 0 && (
              <p className="text-[11px] text-slate-400 dark:text-[#555] mt-2">{Math.round(((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100)}% savings rate</p>
            )}
          </div>
        </div>

        {/* ── Charts Grid ── */}
        <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-3 gap-3 lg:h-full min-h-0 xl:grid-rows-[1fr_1fr]">

          {/* Net Worth Over Time */}
          <div className="xl:col-span-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-4 flex flex-col lg:h-full">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className="w-0.5 h-3 bg-blue-500 rounded-full"></span>
              <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Net Worth Trend</h4>
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={lineOption} style={{height: '100%', minHeight: '180px'}} opts={{ renderer: 'svg' }} />
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-4 flex flex-col lg:h-full">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-0.5 h-3 bg-amber-500 rounded-full"></span>
                <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Asset Allocation</h4>
              </div>
              {data.latestAllocationDate && (
                <span className="text-[10px] text-slate-400 dark:text-[#555]">
                  {new Date(data.latestAllocationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={donutOption} style={{height: '100%', minHeight: '180px'}} opts={{ renderer: 'svg' }} />
            </div>
          </div>

          {/* Savings Rate */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-4 flex flex-col lg:h-full">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className="w-0.5 h-3 bg-emerald-500 rounded-full"></span>
              <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Savings Rate</h4>
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={savingsRateOption} style={{height: '100%', minHeight: '180px'}} opts={{ renderer: 'svg' }} />
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg p-4 flex flex-col lg:h-full">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className="w-0.5 h-3 bg-rose-500 rounded-full"></span>
              <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Expenses by Category</h4>
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={barOption} style={{height: '100%', minHeight: '180px'}} opts={{ renderer: 'svg' }} />
            </div>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] rounded-lg flex flex-col lg:h-full overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-200 dark:border-[#1f1f1f] shrink-0">
            <span className="w-0.5 h-3 bg-slate-500 rounded-full"></span>
            <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Recent Activity</h4>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-slate-100 dark:divide-[#1a1a1a]">
            {(data.recentTransactions || []).map((txn: any, index: number) => (
              <div key={index} className="flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-[#161616] transition-colors cursor-default">
                <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: txn.category?.color || (txn.category?.type === 'Income' ? '#10b981' : txn.category?.type === 'Transfer' ? '#3b82f6' : '#f43f5e') }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 dark:text-[#e0e0e0] truncate leading-tight" title={txn.notes}>{txn.notes || 'No notes'}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 dark:text-[#555]">{formatDateDMY(new Date(txn.date))}</span>
                      <span className="text-slate-400 dark:text-[#333]">·</span>
                      <span className="text-[11px] text-slate-400 dark:text-[#555] truncate">{txn.category?.name || 'Uncategorized'}</span>
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold whitespace-nowrap tabular-nums ${
                    txn.category?.type === 'Income' ? 'text-emerald-400' :
                    txn.category?.type === 'Transfer' ? 'text-blue-400' : 'text-rose-400'
                  }`}>
                  <PrivacyNumber value={txn.amount}>{formatEUR(txn.amount)}</PrivacyNumber>
                </div>
              </div>
            ))}
            {(!data.recentTransactions || data.recentTransactions.length === 0) && (
              <div className="text-sm text-slate-400 dark:text-[#555] text-center py-10">No recent transactions</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
