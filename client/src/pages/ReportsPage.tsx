import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDateDMY, formatEUR } from '../lib/format'
import { usePrivacy } from '@/contexts/PrivacyContext'
import dayjs from 'dayjs' // <-- AGGIUNTO

export function ReportsPage() {
  const { hideNumbers } = usePrivacy()
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const chartTextColor = isDark ? '#e6eef6' : '#0f172a' // light in dark mode, dark in light mode
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'
  const navigate = useNavigate()
  const [cashflow, setCashflow] = useState<any[]>([])
  const [spending, setSpending] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([])
  const [categoryAnalysis, setCategoryAnalysis] = useState<any[]>([])
  const [netWorthTrend, setNetWorthTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Spending by category range (month/year pickers)
  const now = dayjs() // Usiamo dayjs
  const [startMonth, setStartMonth] = useState<number>(now.month()) // 0-11
  const [startYear, setStartYear] = useState<number>(now.year())
  const [endMonth, setEndMonth] = useState<number>(now.month())
  const [endYear, setEndYear] = useState<number>(now.year())

  // Initial load for other charts (use last 6 months by default)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // [FIXED] Date corrette con dayjs (ultimi 6 mesi inclusi oggi)
        const end = dayjs()
        const start = dayjs().subtract(5, 'month')
        
        // Usiamo l'inizio del primo mese e la fine del mese corrente
        const startStr = start.startOf('month').format('YYYY-MM-DD')
        const endStr = end.endOf('month').format('YYYY-MM-DD')
        
        // Load all charts with proper error handling
        const [cashflowData, trendsData, monthlyData, categoryData, netWorthData] = await Promise.allSettled([
          api.reports.cashflow(startStr, endStr),
          api.reports.trends(startStr, endStr),
          api.reports.monthlyExpenses(startStr, endStr),
          api.reports.categoryAnalysis(startStr, endStr),
          api.reports.netWorthTrend(startStr, endStr)
        ])
        
        if (cashflowData.status === 'fulfilled') setCashflow(cashflowData.value as any[])
        if (trendsData.status === 'fulfilled') setTrends(trendsData.value as any[])
        if (monthlyData.status === 'fulfilled') setMonthlyExpenses(monthlyData.value as any[])
        if (categoryData.status === 'fulfilled') setCategoryAnalysis(categoryData.value as any[])
        if (netWorthData.status === 'fulfilled') setNetWorthTrend(netWorthData.value as any[])
        
      } catch (err) {
        console.error('Error loading reports data:', err)
        setError('Failed to load reports data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Fetch spending by category whenever month/year change
  useEffect(() => {
    const fetchSpending = async () => {
      try {
        // [FIXED] Date corrette con dayjs
        const s = dayjs().year(startYear).month(startMonth).startOf('month')
        const e = dayjs().year(endYear).month(endMonth).endOf('month')
        
        const startStr = s.format('YYYY-MM-DD')
        const endStr = e.format('YYYY-MM-DD')
        
        // Normalize if user selects inverted range
        const [from, to] = (s.isBefore(e) || s.isSame(e)) ? [startStr, endStr] : [endStr, startStr]
        const data = await api.reports.spendingByCategory(from, to)
        setSpending((data as any[]) || [])
      } catch (error) {
        console.error('Error loading spending data:', error)
        setSpending([])
      }
    }
    
    fetchSpending()
  }, [startMonth, startYear, endMonth, endYear])

  const cashflowOption = {
    textStyle: { color: chartTextColor },
    xAxis: { type: 'category', data: (cashflow && cashflow.length > 0) ? cashflow.map(r=> formatDateDMY(new Date(r.period+'-01'))) : ['No Data'], axisLabel: { color: chartTextColor }, axisLine: { lineStyle: { color: axisLineColor } } },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : formatEUR(value),
        color: chartTextColor
      },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
  legend: { data: ['Income', 'Expense'], textStyle: { color: chartTextColor } },
    series: [
      { name: 'Income', type: 'bar', data: (cashflow && cashflow.length > 0) ? cashflow.map(r=>r.income) : [0], itemStyle: { color: '#16a34a' } },
      { name: 'Expense', type: 'bar', data: (cashflow && cashflow.length > 0) ? cashflow.map(r=>r.expense) : [0], itemStyle: { color: '#dc2626' } },
    ]
  }

  const palette = ['#3b82f6','#06b6d4','#8b5cf6','#10b981','#f59e0b','#a78bfa','#22c55e','#14b8a6','#0ea5e9','#84cc16']
  const spendingOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`,
      // Make tooltip background dynamic per theme for readability
      backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor }
    },
    color: palette,
    legend: { textStyle: { color: chartTextColor } },
    series: [{
      type: 'pie', radius: ['40%','70%'],
      label: { 
        color: chartTextColor,
        formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
      },
      data: (spending && spending.length > 0) ? spending.map(s=>({ name:s.category, value:s.total })) : [{ name: 'No Data', value: 0 }],
      itemStyle: {
        color: (params: any)=> palette[params.dataIndex % palette.length]
      }
    }]
  }

  // Handle click on spending pie: navigate to Transactions page with date range and category
  const handleSpendingClick = (params: any) => {
    if (!params) return
    const categoryName = params.name || (params.data && params.data.name)
    if (!categoryName) return
    // Use the selected start and end month/year range to navigate to transactions
    const s = dayjs().year(startYear).month(startMonth).startOf('month')
    const e = dayjs().year(endYear).month(endMonth).endOf('month')
    const startStr = s.format('YYYY-MM-DD')
    const endStr = e.format('YYYY-MM-DD')
    const [from, to] = (s.isBefore(e) || s.isSame(e)) ? [startStr, endStr] : [endStr, startStr]
    navigate(`/transactions?startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}&category=${encodeURIComponent(categoryName)}&type=Expense`)
  }

  const trendsOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis',
      valueFormatter: (val: any) => hideNumbers ? '••••••' : formatEUR(val as number),
      backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : undefined,
      textStyle: { color: chartTextColor }
    },
    legend: { data: ['Income', 'Expense'], textStyle: { color: chartTextColor } },
    xAxis: { type: 'category', data: (trends && trends.length > 0) ? trends.map(r=> formatDateDMY(new Date(r.period+'-01'))) : ['No Data'], axisLabel: { color: chartTextColor }, axisLine: { lineStyle: { color: axisLineColor } } },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : formatEUR(value),
        color: chartTextColor
      },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    series: [
      { name: 'Income', type: 'line', data: (trends && trends.length > 0) ? trends.map(r=>r.income) : [0], lineStyle: { color: '#16a34a' }, itemStyle: { color: '#16a34a' } },
      { name: 'Expense', type: 'line', data: (trends && trends.length > 0) ? trends.map(r=>r.expense) : [0], lineStyle: { color: '#dc2626' }, itemStyle: { color: '#dc2626' } },
    ]
  }

  // Monthly Expenses Horizontal Bar Chart
  const monthlyExpensesOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      valueFormatter: (val: any) => hideNumbers ? '••••••' : formatEUR(val as number)
    },
    grid: { left: '15%', right: '10%', top: '10%', bottom: '10%' },
    xAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : formatEUR(value),
        color: chartTextColor
      },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: { 
      type: 'category', 
      data: (monthlyExpenses || []).map(e => e.month),
      axisLabel: { fontSize: 10, color: chartTextColor },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    series: [{
      type: 'bar',
      data: (monthlyExpenses || []).map(e => e.total),
      itemStyle: { color: '#dc2626' },
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => hideNumbers ? '••••••' : `€${params.value.toFixed(2)}`
      }
    }]
  }

  // Handle click on monthly expenses chart
  const handleMonthlyExpensesClick = (params: any) => {
    if (params.data && monthlyExpenses) {
      const clickedMonth = monthlyExpenses[params.dataIndex];
      if (clickedMonth) {
        // [FIXED] Date corrette con dayjs
        const date = dayjs(clickedMonth.month) // Analizza 'YYYY-MM'
        const startStr = date.startOf('month').format('YYYY-MM-DD')
        const endStr = date.endOf('month').format('YYYY-MM-DD')
        
        // Navigate to transactions page with date filters using React Router
        navigate(`/transactions?startDate=${startStr}&endDate=${endStr}&type=Expense`);
      }
    }
  }

  // Handle click on cashflow chart: navigate to Monthly Summary for clicked month
  const handleCashflowClick = (params: any) => {
    if (params && params.dataIndex != null && cashflow && cashflow.length > params.dataIndex) {
      const clicked = cashflow[params.dataIndex]
      if (clicked && clicked.period) {
        // clicked.period is expected to be 'YYYY-MM'
        navigate(`/monthly-summary?month=${encodeURIComponent(clicked.period)}`)
      }
    }
  }

  // Handle click on trends chart: navigate to Monthly Summary for clicked month
  const handleTrendsClick = (params: any) => {
    if (params && params.dataIndex != null && trends && trends.length > params.dataIndex) {
      const clicked = trends[params.dataIndex]
      if (clicked && clicked.period) {
        navigate(`/monthly-summary?month=${encodeURIComponent(clicked.period)}`)
      }
    }
  }

  // Handle click on net worth trend chart: navigate to Monthly Summary for clicked month
  const handleNetWorthClick = (params: any) => {
    if (params && params.dataIndex != null && netWorthTrend && netWorthTrend.length > params.dataIndex) {
      const clicked = netWorthTrend[params.dataIndex]
      if (clicked && clicked.period) {
        navigate(`/monthly-summary?month=${encodeURIComponent(clicked.period)}`)
      }
    }
  }

  // Category Analysis Radar Chart
  const categoryAnalysisOption = {
    textStyle: { color: chartTextColor },
    // Make tooltip background dynamic per theme so the detail window is readable
    tooltip: { trigger: 'item', backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', textStyle: { color: chartTextColor } },
    radar: {
      indicator: (categoryAnalysis && categoryAnalysis.length > 0) ? categoryAnalysis.map(c => ({ name: c.category, max: c.maxValue || 1 })) : [{ name: 'No Data', max: 1 }],
      radius: '70%',
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: gridLineColor } },
      name: { textStyle: { color: chartTextColor } }
    },
    series: [{
      type: 'radar',
      data: (categoryAnalysis && categoryAnalysis.length > 0) ? [{
        value: categoryAnalysis.map(c => c.total),
        name: 'Spending by Category',
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' }
      }] : [{
        value: [0],
        name: 'No Data',
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.2)' }
      }]
    }]
  }

  // Net Worth Trend Area Chart
  const netWorthTrendOption = {
    textStyle: { color: chartTextColor },
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: (netWorthTrend && netWorthTrend.length > 0) ? netWorthTrend.map(n => formatDateDMY(new Date(n.period+'-01'))) : ['No Data'],
      axisLabel: { color: chartTextColor },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : `€${value.toLocaleString()}`,
        color: chartTextColor
      }
    },
    series: [{
      type: 'line',
      data: (netWorthTrend && netWorthTrend.length > 0) ? netWorthTrend.map(n => n.netWorth) : [0],
      areaStyle: { color: 'rgba(16, 185, 129, 0.3)' },
      lineStyle: { color: '#10b981' },
      itemStyle: { color: '#10b981' },
      smooth: true
    }]
  }

  async function exportCsv(path: string) {
    const csv = await api.reports.exportCsv(path)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-2 sm:p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading reports...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="text-red-800">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 sm:p-4 space-y-4">
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Cash Flow</div>
          <button className="text-sm text-blue-700 dark:text-blue-300 whitespace-nowrap" onClick={()=>exportCsv('/api/reports/cashflow')}>Export CSV</button>
        </div>
  <ReactECharts option={cashflowOption} style={{height:300}} onEvents={{ click: handleCashflowClick }} />
      </div>
  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Spending by Category</div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">Start</label>
              <select value={startMonth} onChange={e=>setStartMonth(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-1 text-sm">
                {Array.from({length:12}).map((_,i)=> <option key={i} value={i}>{new Date(2000,i,1).toLocaleString(undefined,{month:'short'})}</option>)}
              </select>
              <select value={startYear} onChange={e=>setStartYear(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-1 text-sm">
                {Array.from({length:11}).map((_,i)=>{
                  const y = now.year() - i
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">End</label>
              <select value={endMonth} onChange={e=>setEndMonth(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-1 text-sm">
                {Array.from({length:12}).map((_,i)=> <option key={i} value={i}>{new Date(2000,i,1).toLocaleString(undefined,{month:'short'})}</option>)}
              </select>
              <select value={endYear} onChange={e=>setEndYear(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-1 text-sm">
                {Array.from({length:11}).map((_,i)=>{
                  const y = now.year() - i
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>
          </div>
          <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>{
            // [FIXED] Date corrette con dayjs
            const s = dayjs().year(startYear).month(startMonth).startOf('month')
            const e = dayjs().year(endYear).month(endMonth).endOf('month')
            const startStr = s.format('YYYY-MM-DD')
            const endStr = e.format('YYYY-MM-DD')
            const [from, to] = (s.isBefore(e) || s.isSame(e)) ? [startStr, endStr] : [endStr, startStr]
            exportCsv(`/api/reports/spending-by-category?start=${from}&end=${to}`)
          }}>Export CSV</button>
        </div>
  <ReactECharts option={spendingOption} style={{height:300}} onEvents={{ click: handleSpendingClick }} />
      </div>
  <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Income vs Expense Trend</div>
          <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/trends')}>Export CSV</button>
        </div>
  <ReactECharts option={trendsOption} style={{height:300}} onEvents={{ click: handleTrendsClick }} />
      </div>
      
      {/* New Charts */}
  <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Monthly Expenses Breakdown</div>
          <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/monthly-expenses')}>Export CSV</button>
        </div>
        <ReactECharts 
          option={monthlyExpensesOption} 
          style={{height:300}} 
          onEvents={{
            click: handleMonthlyExpensesClick
          }}
        />
      </div>
      
      {/* Additional Charts - Only show if data is available */}
      {(categoryAnalysis && categoryAnalysis.length > 0) || (netWorthTrend && netWorthTrend.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categoryAnalysis && categoryAnalysis.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Category Analysis</div>
                <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/category-analysis')}>Export CSV</button>
              </div>
              <ReactECharts option={categoryAnalysisOption} style={{height:300}} />
            </div>
          )}
          
          {netWorthTrend && netWorthTrend.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Net Worth Trend</div>
                <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/net-worth-trend')}>Export CSV</button>
              </div>
              <ReactECharts option={netWorthTrendOption} style={{height:300}} onEvents={{ click: handleNetWorthClick }} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}