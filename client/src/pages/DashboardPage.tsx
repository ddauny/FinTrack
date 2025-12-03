import ReactECharts from 'echarts-for-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useThemeContext } from '@/contexts/ThemeContext'

export function DashboardPage() {
  const { hideNumbers } = usePrivacy()
  const { resolved } = useThemeContext()
  const [data, setData] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

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
  if (!data) return <div>Loading...</div>
  const startIndex = isMobile ? Math.max(0, (data.netWorthHistory?.length || 0) - 7) : 0;
  const lineOption = {
    backgroundColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
    textStyle: {
      color: resolved === 'dark' ? '#f3f4f6' : '#111827'
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
        color: resolved === 'dark' ? '#d1d5db' : '#6b7280',
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
        color: resolved === 'dark' ? '#d1d5db' : '#6b7280',
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          color: resolved === 'dark' ? '#374151' : '#e5e7eb'
        }
      }
    },
    tooltip: { 
      trigger: 'axis',
      backgroundColor: resolved === 'dark' ? '#374151' : '#ffffff',
      borderColor: resolved === 'dark' ? '#4b5563' : '#d1d5db',
      textStyle: {
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      },
      formatter: (params: any) => {
        if (hideNumbers) {
          return `${params[0].name}<br/>Net Worth: ••••••`
        }
        return `${params[0].name}<br/>Net Worth: ${formatEUR(params[0].value)}`
      },
      confine: true
    },
    series: [{
      type: 'line',
      symbolSize: 8,
      lineStyle: {
        color: resolved === 'dark' ? '#3b82f6' : '#2563eb'
      },
      itemStyle: {
        color: resolved === 'dark' ? '#3b82f6' : '#2563eb'
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
          color: resolved === 'dark' ? '#f3f4f6' : '#111827',
          distance: 5
        }
      })) ?? []
    }]
  }
  const donutOption = {
    backgroundColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
    textStyle: {
      color: resolved === 'dark' ? '#f3f4f6' : '#111827'
    },
    color: resolved === 'dark' ? ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] : ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'],
    tooltip: { 
      trigger: 'item',
      backgroundColor: resolved === 'dark' ? '#374151' : '#ffffff',
      borderColor: resolved === 'dark' ? '#4b5563' : '#d1d5db',
      textStyle: {
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      },
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`,
      confine: true
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: {
        color: resolved === 'dark' ? '#f3f4f6' : '#111827',
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
        color: resolved === 'dark' ? '#f3f4f6' : '#111827',
        show: !isMobile
      }
    }]
  }
  const barOption = {
    backgroundColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
    textStyle: {
      color: resolved === 'dark' ? '#f3f4f6' : '#111827'
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
      backgroundColor: resolved === 'dark' ? '#374151' : '#ffffff',
      borderColor: resolved === 'dark' ? '#4b5563' : '#d1d5db',
      textStyle: {
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      },
      formatter: (params: any) => {
        const data = params[0]
        return hideNumbers ? `${data.name}: ••••••` : `${data.name}: ${formatEUR(data.value)}`
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
        color: resolved === 'dark' ? '#d1d5db' : '#6b7280'
      },
      axisLine: {
        lineStyle: {
          color: resolved === 'dark' ? '#4b5563' : '#d1d5db'
        }
      }
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (hideNumbers) return '••••••';
          if (value >= 1000) return `€${(value/1000).toFixed(0)}k`;
          return `€${value}`;
        },
        fontSize: 10,
        color: resolved === 'dark' ? '#d1d5db' : '#6b7280'
      },
      splitLine: {
        lineStyle: {
          color: resolved === 'dark' ? '#374151' : '#e5e7eb'
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
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      }
    }]
  }
  return (
      	<div className="p-3 space-y-3 lg:h-[calc(100vh-4.25rem)] lg:overflow-y-auto hide-scrollbar flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:items-start lg:h-full lg:grid-rows-[auto_1fr]">
            {/* Top row - Key metrics */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 shrink-0">
              
              {/* Net Worth Card */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Worth</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
                    <PrivacyNumber value={data.netWorth}>
                      {formatEUR(data.netWorth)}
                    </PrivacyNumber>
                  </h3>
                  {data.netWorthGrowth !== null && data.netWorthGrowth !== undefined && (
                    <div className={`flex items-center mt-1 text-xs font-medium ${data.netWorthGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <span>{data.netWorthGrowth >= 0 ? '+' : ''}{data.netWorthGrowth.toFixed(1)}%</span>
                      <span className="text-gray-400 dark:text-gray-500 ml-1 font-normal">from last month</span>
                    </div>
                  )}
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
              </div>

              {/* Cash Flow Card */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cash Flow</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
                    <PrivacyNumber value={data.cashFlowLast30Days||0}>
                      {formatEUR(data.cashFlowLast30Days||0)}
                    </PrivacyNumber>
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Current month</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
              </div>

              {/* Monthly Expenses Card */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between sm:col-span-2 lg:col-span-1 transition-all hover:shadow-md">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monthly Expenses</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
                    <PrivacyNumber value={data.monthlyExpenses || 0}>
                      {formatEUR(data.monthlyExpenses || 0)}
                    </PrivacyNumber>
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Current month</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
              </div>
            </div>
    
            {/* Charts Grid */}
            <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-2 gap-3 lg:h-full min-h-0 xl:grid-rows-[1fr_1fr]">
              {/* Net Worth Over Time */}
              <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:h-full">
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Net Worth Trend</h4>
                <div className="flex-1 min-h-0">
              	  <ReactECharts option={lineOption} style={{height: '100%', minHeight: '180px'}} />
                </div>
              </div>
              
              {/* Asset Allocation */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:h-full">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">Asset Allocation</h4>
                  {data.latestAllocationDate && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                      {new Date(data.latestAllocationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-0">
              	  <ReactECharts option={donutOption} style={{height: '100%', minHeight: '180px'}} />
                </div>
              </div>
              
              {/* Monthly Expense Breakdown */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:h-full">
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Expenses by Category</h4>
                <div className="flex-1 min-h-0">
              	  <ReactECharts option={barOption} style={{height: '100%', minHeight: '180px'}} />
                </div>
              </div>
            </div>
    
            {/* Recent Transactions Sidebar */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:h-full overflow-hidden">
              <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3 shrink-0">Recent Activity</h4>
            	<div className="space-y-3 overflow-y-auto hide-scrollbar flex-1 pr-1">
              {(data.recentTransactions || []).map((txn: any, index: number) => (
                <div key={index} className="group flex items-center justify-between p-1.5 -mx-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{txn.notes || 'No notes'}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatDateDMY(new Date(txn.date))}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">•</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{txn.category?.name || 'Uncategorized'}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-bold whitespace-nowrap ${
                  	  txn.category?.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 
                      txn.category?.type === 'Transfer' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}>
                  	<PrivacyNumber value={txn.amount}>
                  	  {txn.category?.type === 'Income' ? '+' : ''}{formatEUR(txn.amount)}
                  	</PrivacyNumber>
                  </div>
                </div>
              ))}
              {(!data.recentTransactions || data.recentTransactions.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-8">No recent transactions</div>
              )}
            </div>
          </div>
        </div>
      </div>
      )
}