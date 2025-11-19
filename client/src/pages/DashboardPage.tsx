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
  const lineOption = {
    backgroundColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
    textStyle: {
      color: resolved === 'dark' ? '#f3f4f6' : '#111827'
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '20%',
      top: '10%',
      containLabel: true
    },
    xAxis: { 
      type: 'category', 
      data: data.netWorthHistory?.map((d:any)=> formatDateDMY(d.date)) ?? [],
      axisLabel: {
        color: resolved === 'dark' ? '#d1d5db' : '#6b7280',
        rotate: 45,
        fontSize: 10,
        interval: 0
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
          show: true,
          position: index % 2 === 0 ? 'top' : 'bottom',
          formatter: () => hideNumbers ? '••••••' : formatEUR(d.value),
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
      }
    },
    series: [{
      type: 'pie', 
      radius: ['40%','65%'],
      center: ['50%', '45%'],
      data: (data.assetAllocation||[]).map((a:any)=>({ 
        name: a.class, 
        value: Number(a.value).toFixed(2) // Limit to 2 decimal places
      })),
      label: {
        fontSize: 10,
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      }
    }]
  }
  const barOption = {
    backgroundColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
    textStyle: {
      color: resolved === 'dark' ? '#f3f4f6' : '#111827'
    },
    grid: {
      left: '5%',
      right: '3%',
      top: '10%',
      bottom: '25%',
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
        interval: 0,
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
      	<div className="p-2 sm:p-4">
          {/* MODIFICA: Aggiunto 'lg:items-start' per allineare le colonne in alto */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 **lg:items-start**">
            {/* Top row - Key metrics (invariato) */}
          	<div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {/* ... metriche ... */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-sm text-gray-600 dark:text-gray-300">Net Worth</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  <PrivacyNumber value={data.netWorth}>
                    {formatEUR(data.netWorth)}
                  </PrivacyNumber>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-sm text-gray-600 dark:text-gray-300">Cash Flow (Current Month)</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  <PrivacyNumber value={data.cashFlowLast30Days||0}>
                    {formatEUR(data.cashFlowLast30Days||0)}
                  </PrivacyNumber>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow sm:col-span-2 lg:col-span-1">
                <div className="text-sm text-gray-600 dark:text-gray-300">Monthly Expenses</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  <PrivacyNumber value={data.monthlyExpenses || 0}>
                    {formatEUR(data.monthlyExpenses || 0)}
                  </PrivacyNumber>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Total spent this month
                </div>
              </div>
            </div>
    
            {/* Charts Grid - TORNATO ALLA STRUTTURA ORIGINALE, RIMOSSO flex-col */}
            <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Net Worth Over Time - RIMOSSO style={{ marginBottom:'auto' }} */}
              <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Net Worth Over Time</div>
              	<ReactECharts option={lineOption} style={{height:250}} />
              </div>
              
              {/* Asset Allocation - RIMOSSO style={{ marginBottom:'auto' }} */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Asset Allocation</div>
              	<ReactECharts option={donutOption} style={{height:250}} />
              </div>
              
              {/* Monthly Expense Breakdown - RIMOSSO style={{ marginBottom:'auto' }} */}
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Monthly Expense Breakdown</div>
              	<ReactECharts option={barOption} style={{height:250}} />
              </div>
            </div>
    
            {/* Recent Transactions Sidebar - RIMOSSO h-full e flex-col */}
            {/* Recent Transactions Sidebar */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Recent Transactions</div>
              {/* Scrollable area for up to 30 transactions */}
            	<div className="space-y-1 overflow-y-auto hide-scrollbar max-h-96 lg:max-h-[554px]">
              {(data.recentTransactions || []).map((txn: any, index: number) => (
                <div key={index} className="border-b pb-1 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{txn.notes || 'No notes'}</div>
                  	<div className="text-xs text-gray-500">{formatDateDMY(new Date(txn.date))}</div>
                  	<div className="text-xs text-gray-400 truncate">{txn.category?.name || 'Unknown'}</div>
                  </div>
                    <div className={`text-sm font-medium ml-2 ${
                  	  txn.category?.type === 'Income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                  	<PrivacyNumber value={txn.amount}>
                  	  {txn.category?.type === 'Income' ? '+' : '-'}{formatEUR(Math.abs(txn.amount))}
                  	</PrivacyNumber>
                  </div>
                  </div>
                </div>
              ))}
              {(!data.recentTransactions || data.recentTransactions.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-4">No recent transactions</div>
              )}
            </div>
          </div>
        </div>
      </div>
      )
}