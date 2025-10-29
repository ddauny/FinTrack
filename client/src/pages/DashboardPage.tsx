import ReactECharts from 'echarts-for-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatEUR, formatDateDMY } from '@/lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'

export function DashboardPage() {
  const { hideNumbers } = usePrivacy()
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
          {/* MODIFICA: Aggiunto 'lg:items-start' per allineare le colonne in alto */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 **lg:items-start**">
            {/* Top row - Key metrics (invariato) */}
          	<div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {/* ... metriche ... */}
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Net Worth</div>
                <div className="text-xl sm:text-2xl font-bold">
                  <PrivacyNumber value={data.netWorth}>
                    {formatEUR(data.netWorth)}
                  </PrivacyNumber>
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-600">Cash Flow (Current Month)</div>
                <div className="text-xl sm:text-2xl font-bold">
                  <PrivacyNumber value={data.cashFlowLast30Days||0}>
                    {formatEUR(data.cashFlowLast30Days||0)}
                  </PrivacyNumber>
                </div>
              </div>
              <div className="bg-white p-3 rounded shadow sm:col-span-2 lg:col-span-1">
                <div className="text-sm text-gray-600">Monthly Expenses</div>
                <div className="text-xl sm:text-2xl font-bold">
                  <PrivacyNumber value={data.monthlyExpenses || 0}>
                    {formatEUR(data.monthlyExpenses || 0)}
                  </PrivacyNumber>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total spent this month
                </div>
              </div>
            </div>
    
            {/* Charts Grid - TORNATO ALLA STRUTTURA ORIGINALE, RIMOSSO flex-col */}
            <div className="lg:col-span-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Net Worth Over Time - RIMOSSO style={{ marginBottom:'auto' }} */}
              <div className="xl:col-span-2 bg-white p-3 rounded shadow">
                <div className="font-semibold mb-1">Net Worth Over Time</div>
              	<ReactECharts option={lineOption} style={{height:250}} />
              </div>
              
              {/* Asset Allocation - RIMOSSO style={{ marginBottom:'auto' }} */}
              <div className="bg-white p-3 rounded shadow">
                <div className="font-semibold mb-1">Asset Allocation</div>
              	<ReactECharts option={donutOption} style={{height:250}} />
              </div>
              
              {/* Monthly Expense Breakdown - RIMOSSO style={{ marginBottom:'auto' }} */}
              <div className="bg-white p-3 rounded shadow">
                <div className="font-semibold mb-1">Monthly Expense Breakdown</div>
              	<ReactECharts option={barOption} style={{height:250}} />
              </div>
            </div>
    
            {/* Recent Transactions Sidebar - RIMOSSO h-full e flex-col */}
            {/* Recent Transactions Sidebar */}
            <div className="lg:col-span-1 bg-white p-3 rounded shadow">
              <div className="font-semibold mb-2">Recent Transactions</div>
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