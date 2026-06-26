import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '../components/PrivacyNumber'
import { usePrivacy } from '../contexts/PrivacyContext'
import { useThemeContext } from '../contexts/ThemeContext'

/** Escape HTML special characters to prevent XSS in ECharts tooltip formatters */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { hideNumbers } = usePrivacy()
  const { resolved } = useThemeContext()
  const [data, setData] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

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

  const handleCategoryClick = (categoryName: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    
    // Format YYYY-MM-DD using local time
    const formatDate = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }
    
    navigate(`/transactions?startDate=${formatDate(start)}&endDate=${formatDate(end)}&type=Expense&category=${encodeURIComponent(categoryName)}`)
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize() // set correct value on mount
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
    if (!data || !Array.isArray(data.netWorthHistory)) return {};
    const history = data.netWorthHistory;
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
        startValue: Math.max(0, history.length - 7),
        endValue: history.length - 1,
        zoomLock: false
      }
    ] : [],
    xAxis: { 
      type: 'category', 
      data: history.map((d:any)=> {
        try {
          if (!d || !d.date) return 'N/A';
          return new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        } catch (e) {
          return 'N/A'
        }
      }),
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
          const val = Number(value) || 0;
          if (val >= 1000) return `€${(val/1000).toFixed(0)}k`;
          return `€${val}`;
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
      transitionDuration: 0, 
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
        if (!params || !Array.isArray(params) || params.length === 0 || !params[0]) return '';
        const name = escHtml(String(params[0].name || ''));
        if (hideNumbers) {
          return `<div class="font-bold mb-1">${name}</div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Net Worth: ••••••</div>`
        }
        return `<div class="font-bold mb-1">${name}</div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-500"></span>Net Worth: <span class="font-mono font-bold">${formatEUR(params[0].value)}</span></div>`
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
      data: history.map((d:any, index: number) => ({
        value: d.value,
        label: {
          show: !(isMobile && index === startIndex),
          position: index % 2 === 0 ? 'top' : 'bottom',
          formatter: () => {
            if (hideNumbers) return '••••••';
            const val = Number(d.value) || 0;
            if (isMobile) {
              if (Math.abs(val) >= 1000000) return '€' + (val / 1000000).toFixed(2) + 'm';
              if (Math.abs(val) >= 1000) return '€' + (val / 1000).toFixed(1) + 'k';
              return '€' + val.toFixed(0);
            }
            return formatEUR(val);
          },
          fontSize: 10,
          color: resolved === 'dark' ? '#e8e8e8' : '#141414',
          distance: 5
        }
      }))
    }]
  };
  }, [resolved, data, hideNumbers, isMobile, startIndex]);

  const donutOption = useMemo(() => {
    if (!data || !Array.isArray(data.assetAllocation)) return {};
    const allocation = data.assetAllocation;
    return {
    backgroundColor: 'transparent',
    textStyle: {
      color: resolved === 'dark' ? '#e8e8e8' : '#141414'
    },
    color: resolved === 'dark' ? ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] : ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'],
    tooltip: {
      transitionDuration: 0, 
      trigger: 'item',
      backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
      borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
      textStyle: { color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f' },
      borderRadius: 12,
      padding: 12,
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
      formatter: (params: any) => {
        if (!params) return '';
        const val = hideNumbers ? '••••••' : formatEUR(params.value);
        const name = escHtml(String(params.name || ''));
        return `<div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center;">
              <span style="margin-left: 4px;">Value</span>
            </span>
            <span style="font-weight: bold; margin-left: 12px;">${val}</span>
          </div>
          <div style="margin-top: 4px; font-size: 0.9em; color: ${resolved === 'dark' ? '#666666' : '#666666'}">
            ${escHtml(String(params.percent || 0))}% of total
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
      data: allocation.map((a:any)=>({ 
        name: a.class || 'Unknown', 
        value: Number(a.value || 0).toFixed(2)
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
    if (!data || !Array.isArray(data.expenseBreakdown)) return {};
    const breakdown = data.expenseBreakdown;
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
      transitionDuration: 0, 
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
      borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
      textStyle: { color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f' },
      borderRadius: 12,
      padding: 12,
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
      formatter: (params: any) => {
        if (!params || !Array.isArray(params) || params.length === 0 || !params[0]) return '';
        const data = params[0];
        const val = hideNumbers ? '••••••' : formatEUR(data.value);
        const name = escHtml(String(data.name || ''));
        return `<div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center;">
              <span style="margin-left: 4px;">Total</span>
            </span>
            <span style="font-weight: bold; margin-left: 12px;">${val}</span>
          </div>`;
      },
      confine: true
    },
    xAxis: { 
      type: 'category', 
      data: breakdown.map((e:any)=>e.category || 'Unknown'),
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
          const val = Number(value) || 0;
          if (val >= 1000) return `€${(val/1000).toFixed(0)}k`;
          return `€${val}`;
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
      data: breakdown.map((e:any)=> Number(e.total || 0)), 
      itemStyle: { 
        color: resolved === 'dark' ? '#ef4444' : '#dc2626'
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          if (hideNumbers) return '••••••';
          const val = Number(params.value) || 0;
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
    if (!data || !Array.isArray(data.monthlyCashFlowHistory)) return {};
    const history = (data.monthlyCashFlowHistory).map((d: any) => {
      let label = 'N/A';
      try {
        if (d && d.month && typeof d.month === 'string') {
          const [y, m] = d.month.split('-');
          label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
      } catch (e) {}
      
      return {
        label,
        rate: (d && d.income > 0) ? Math.round(((d.income - d.expense) / d.income) * 100) : 0,
      }
    });
    const posColor = resolved === 'dark' ? '#34d399' : '#059669';
    const negColor = resolved === 'dark' ? '#f87171' : '#dc2626';
    return {
      backgroundColor: 'transparent',
      textStyle: { color: resolved === 'dark' ? '#e8e8e8' : '#141414' },
      grid: { left: '3%', right: '3%', top: '8%', bottom: '12%', containLabel: true },
      tooltip: {
      transitionDuration: 0,
        trigger: 'axis',
        backgroundColor: resolved === 'dark' ? '#141414' : '#ffffff',
        borderColor: resolved === 'dark' ? '#1f1f1f' : '#f0f0f0',
        textStyle: { color: resolved === 'dark' ? '#f0f0f0' : '#1f1f1f' },
        borderRadius: 12,
        padding: 12,
        formatter: (params: any) => {
          if (!params || !Array.isArray(params) || params.length === 0 || !params[0]) return '';
          const val = hideNumbers ? '••%' : `${params[0].value}%`;
          const name = escHtml(String(params[0].name || ''));
          return `<div style="font-weight:bold;margin-bottom:4px">${name}</div><div>Savings Rate: <b>${val}</b></div>`;
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

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="w-48 h-1 bg-slate-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-600 w-1/3 animate-[shimmer_1.5s_infinite] rounded-full" style={{ animationTimingFunction: 'ease-in-out' }}></div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Initializing</p>
          <p className="text-[9px] font-medium text-slate-300 dark:text-slate-700">Loading your financial data...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="p-3 space-y-3 lg:h-[calc(100vh-52px)] lg:overflow-hidden flex flex-col animate-page-entry">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:min-h-full lg:grid-rows-[auto_1fr]">

        {/* ── Metric strip ── */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-200 dark:divide-[#1f1f1f] glass-card gradient-border-card rounded-xl shrink-0 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom stagger-1">

          {/* Net Worth */}
          <div className="p-4 lg:p-5">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-[#555] uppercase tracking-widest mb-2">Net Worth</p>
            <div className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-[#f0f0f0] tabular-nums leading-none">
              <PrivacyNumber value={data.netWorth || 0}>{formatEUR(data.netWorth || 0)}</PrivacyNumber>
            </div>
            {data.netWorthGrowth !== null && data.netWorthGrowth !== undefined && (
              <div className={`flex items-center mt-2 text-xs font-semibold ${data.netWorthGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.netWorthGrowth >= 0 ? '▲' : '▼'} {Math.abs(Number(data.netWorthGrowth) || 0).toFixed(1)}%
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
          <div className="xl:col-span-3 glass-card gradient-border-card rounded-xl p-4 flex flex-col lg:h-full shadow-sm animate-in fade-in slide-in-from-bottom stagger-2">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className="w-0.5 h-3 bg-blue-500 rounded-full"></span>
              <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Net Worth Trend</h4>
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={lineOption} style={{height: '100%', minHeight: '180px'}} />
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="glass-card gradient-border-card rounded-xl p-4 flex flex-col lg:h-full shadow-sm animate-in fade-in slide-in-from-bottom stagger-3">
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
              <ReactECharts option={donutOption} style={{height: '100%', minHeight: '180px'}} />
            </div>
          </div>

          {/* Savings Rate */}
          <div className="glass-card gradient-border-card rounded-xl p-4 flex flex-col lg:h-full shadow-sm animate-in fade-in slide-in-from-bottom stagger-4">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className="w-0.5 h-3 bg-emerald-500 rounded-full"></span>
              <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Savings Rate</h4>
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts option={savingsRateOption} style={{height: '100%', minHeight: '180px'}} />
            </div>
          </div>

          {/* Expenses by Category */}
          <div className="glass-card gradient-border-card rounded-xl p-4 flex flex-col lg:h-full shadow-sm animate-in fade-in slide-in-from-bottom stagger-5">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <span className="w-0.5 h-3 bg-rose-500 rounded-full"></span>
              <h4 className="text-[10px] font-semibold text-slate-400 dark:text-[#666] uppercase tracking-widest">Expenses by Category</h4>
            </div>
            <div className="flex-1 min-h-0 cursor-pointer">
              <ReactECharts 
                option={barOption} 
                style={{height: '100%', minHeight: '180px'}} 
                onEvents={{ click: (params: any) => { if (params.name) handleCategoryClick(params.name) } }}
              />
            </div>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="lg:col-span-1 glass-card gradient-border-card rounded-xl flex flex-col lg:h-full overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom stagger-6">
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
                      <span className="text-[11px] text-slate-400 dark:text-[#555]">{txn.date ? formatDateDMY(new Date(txn.date)) : 'N/A'}</span>
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
