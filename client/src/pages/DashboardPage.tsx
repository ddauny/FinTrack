import ReactECharts from 'echarts-for-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatEUR, formatDateDMY } from '@/lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'

export function DashboardPage() {
  const { hideNumbers } = usePrivacy()
  const [data, setData] = useState<any>(null)
  
  // MODIFICA: Stato per il tema dei grafici ECharts
  const [chartTheme, setChartTheme] = useState('light')

  // MODIFICA: Effect per rilevare il tema (light/dark) dalla classe sull'elemento <html>
  // e aggiornare lo stato per i grafici.
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setChartTheme(isDark ? 'dark' : 'light')
    }

    updateTheme() // Imposta il tema iniziale

    // Osserva le modifiche alla classe dell'elemento <html>
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })

    return () => observer.disconnect()
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

  // Le opzioni dei grafici rimangono invariate, 
  // ECharts gestirà i colori del testo (assi, tooltip)
  // quando gli viene passato il `theme` prop.
  const lineOption = {
    xAxis: { type: 'category', data: data.netWorthHistory?.map((d:any)=> formatDateDMY(d.date)) ?? [] },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : formatEUR(value)
      }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: (params: any) => {
        if (hideNumbers) {
          return `${params[0].name}<br/>Net Worth: ••••••`
        }
        return `${params[0].name}<br/>Net Worth: ${formatEUR(params[0].value)}`
      }
    },
    series: [{
      type: 'line',
      symbolSize: 8,
      data: data.netWorthHistory?.map((d:any, index: number) => ({
        value: d.value,
        label: {
          show: true,
          position: index % 2 === 0 ? 'top' : 'bottom',
          formatter: () => hideNumbers ? '••••••' : formatEUR(d.value),
          fontSize: 10,
          distance: 5
        }
      })) ?? []
    }]
  }

  const donutOption = {
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
    },
    series: [{
      type: 'pie', 
      radius: ['50%','70%'],
      data: (data.assetAllocation||[]).map((a:any)=>({ 
        name: a.class, 
        value: Number(a.value).toFixed(2) // Limit to 2 decimal places
      }))
    }]
  }

  const barOption = {
    grid: {
      left: '15%',
      right: '5%',
      top: '10%',
      bottom: '20%'
    },
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0]
        return hideNumbers ? `${data.name}: ••••••` : `${data.name}: ${formatEUR(data.value)}`
      }
    },
    xAxis: { 
      type: 'category', 
      data: (data.expenseBreakdown||[]).map((e:any)=>e.category),
      axisLabel: {
        show: true,
        interval: 0, // Show all labels
        rotate: 45, // Rotate labels for better readability
        fontSize: 10
      }
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : formatEUR(value),
        fontSize: 10
      }
    },
    series: [{ 
      type: 'bar', 
      data: (data.expenseBreakdown||[]).map((e:any)=>e.total), 
      itemStyle: { color: '#dc2626' },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => hideNumbers ? '••••••' : formatEUR(params.value),
        fontSize: 10
      }
    }]
  }

  return (
      <div className="p-2 sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:items-start">
          {/* Top row - Key metrics */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {/* MODIFICA: Aggiunte classi dark: */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Net Worth</div>
              <div className="text-xl sm:text-2xl font-bold dark:text-white">
                <PrivacyNumber value={data.netWorth}>
                  {formatEUR(data.netWorth)}
                </PrivacyNumber>
              </div>
            </div>
            {/* MODIFICA: Aggiunte classi dark: */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Cash Flow (Current Month)</div>
              <div className="text-xl sm:text-2xl font-bold dark:text-white">
                <PrivacyNumber value={data.cashFlowLast30Days||0}>
                  {formatEUR(data.cashFlowLast30Days||0)}
                </PrivacyNumber>
              </div>
            </div>
            {/* MODIFICA: Aggiunte classi dark: */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow sm:col-span-2 lg:col-span-1">
              <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Expenses</div>
              <div className="text-xl sm:text-2xl font-bold dark:text-white">
                <PrivacyNumber value={data.monthlyExpenses || 0}>
                  {formatEUR(data.monthlyExpenses || 0)}
                </PrivacyNumber>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Total spent this month
              </div>
            </div>
          </div>
  
          {/* Charts Grid */}
          <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* MODIFICA: Aggiunte classi dark: e prop 'theme' */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="font-semibold mb-1 dark:text-white">Net Worth Over Time</div>
              <ReactECharts option={lineOption} style={{height:250}} theme={chartTheme} />
            </div>
            
            {/* MODIFICA: Aggiunte classi dark: e prop 'theme' */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="font-semibold mb-1 dark:text-white">Asset Allocation</div>
              <ReactECharts option={donutOption} style={{height:250}} theme={chartTheme} />
            </div>
            
            {/* MODIFICA: Aggiunte classi dark: e prop 'theme' */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
              <div className="font-semibold mb-1 dark:text-white">Monthly Expense Breakdown</div>
              <ReactECharts option={barOption} style={{height:250}} theme={chartTheme} />
            </div>
          </div>
  
          {/* Recent Transactions Sidebar */}
          {/* MODIFICA: Aggiunte classi dark: */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-3 rounded shadow">
            <div className="font-semibold mb-2 dark:text-white">Recent Transactions</div>
            {/* Scrollable area */}
            <div className="space-y-1 overflow-y-auto hide-scrollbar max-h-96 lg:max-h-[554px]">
            {(data.recentTransactions || []).map((txn: any, index: number) => (
              // MODIFICA: Aggiunta classe dark: per il bordo
              <div key={index} className="border-b dark:border-gray-700 pb-1 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    {/* MODIFICA: Aggiunte classi dark: per i testi */}
                    <div className="text-sm font-medium truncate dark:text-gray-100">{txn.notes || 'No notes'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateDMY(new Date(txn.date))}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{txn.category?.name || 'Unknown'}</div>
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
              // MODIFICA: Aggiunta classe dark:
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent transactions</div>
            )}
          </div>
        </div>
      </div>
    </div>
    )
}