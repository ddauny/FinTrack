import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatEUR, formatDateDMY } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useThemeContext } from '@/contexts/ThemeContext'
import dayjs from 'dayjs'

export function MonthlySummaryPage() {
  const { hideNumbers } = usePrivacy()
  const { resolved } = useThemeContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load monthly data when month changes
  useEffect(() => {
    const loadMonthlyData = async () => {
      setLoading(true)
      try {
        const [startDate, endDate] = getMonthRange(selectedMonth)
        
        // Fetch transactions for the selected month
        const query = `?startDate=${startDate}&endDate=${endDate}&limit=1000`
        console.log('Fetching transactions with query:', query)
        const res = await api.transactions.list(query)
        const transactions = (res as any).items || []
        console.log('Fetched transactions:', transactions.length, 'items')

        // Group by category type and calculate totals
        const income = new Map()
        const expenses = new Map()
        
        transactions.forEach((txn: any) => {
          const category = txn.category
          if (!category) return
          
          const amount = Math.abs(txn.amount)
          const categoryName = category.name
          
          if (category.type === 'Income') {
            income.set(categoryName, (income.get(categoryName) || 0) + amount)
          } else if (category.type === 'Expense') {
            expenses.set(categoryName, (expenses.get(categoryName) || 0) + amount)
          }
        })

        // Convert to arrays and sort by amount
        const incomeArray = Array.from(income.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
        
        const expensesArray = Array.from(expenses.entries())
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)

        const totalIncome = incomeArray.reduce((sum, item) => sum + item.amount, 0)
        const totalExpenses = expensesArray.reduce((sum, item) => sum + item.amount, 0)

        console.log('Processed data:', {
          income: incomeArray,
          expenses: expensesArray,
          totalIncome,
          totalExpenses,
          netResult: totalIncome - totalExpenses
        })

        setMonthlyData({
          income: incomeArray,
          expenses: expensesArray,
          totalIncome,
          totalExpenses,
          netResult: totalIncome - totalExpenses
        })
      } catch (error) {
        console.error('Error loading monthly data:', error)
        setMonthlyData(null)
      } finally {
        setLoading(false)
      }
    }

    loadMonthlyData()
  }, [selectedMonth])

  // If `month` is provided as query param (YYYY-MM), set selectedMonth accordingly
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const m = params.get('month')
      if (m) {
        // Accept YYYY-MM or a full ISO date (YYYY-MM-DD / YYYY-MM-DDTHH:MM:SSZ)
        if (/^\d{4}-\d{2}$/.test(m)) {
          setSelectedMonth(m)
        } else {
          try {
            const normalized = dayjs(m).format('YYYY-MM')
            if (/^\d{4}-\d{2}$/.test(normalized)) setSelectedMonth(normalized)
          } catch (err) {
            // ignore invalid format
          }
        }
      }
      const c = params.get('category')
      if (c) setSelectedCategory(c)
    } catch (err) {
      // ignore
    }
  }, [location.search])

  const getMonthRange = (monthStr: string) => {
    const date = dayjs(monthStr) // Parse 'YYYY-MM'
    const startDate = date.startOf('month').format('YYYY-MM-DD')
    const endDate = date.endOf('month').format('YYYY-MM-DD')
    return [startDate, endDate]
  }

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Handle click on income chart
  const handleIncomeChartClick = (params: any) => {
    if (params.data && monthlyData) {
      const clickedCategory = params.data.name
      const [startDate, endDate] = getMonthRange(selectedMonth)
      
      // Navigate to transactions page with month and category filters
      navigate(`/transactions?startDate=${startDate}&endDate=${endDate}&category=${encodeURIComponent(clickedCategory)}`)
    }
  }

  // Handle click on expenses chart
  const handleExpensesChartClick = (params: any) => {
    if (params.data && monthlyData) {
      const clickedCategory = params.data.name
      const [startDate, endDate] = getMonthRange(selectedMonth)
      
      // Navigate to transactions page with month and category filters
      navigate(`/transactions?startDate=${startDate}&endDate=${endDate}&category=${encodeURIComponent(clickedCategory)}`)
    }
  }

  const handlePrevMonth = () => {
    const newMonth = dayjs(selectedMonth).subtract(1, 'month').format('YYYY-MM');
    setSelectedMonth(newMonth);
  };
  
  const handleNextMonth = () => {
    const newMonth = dayjs(selectedMonth).add(1, 'month').format('YYYY-MM');
    setSelectedMonth(newMonth);
  };

  const incomeColors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9']
  const expenseColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#f43f5e', '#d946ef']

  // --- MODIFICA: Stile professionale per i grafici ---
  const incomeChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: resolved === 'dark' ? '#374151' : '#ffffff',
      borderColor: resolved === 'dark' ? '#4b5563' : '#d1d5db',
      textStyle: {
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      },
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
    },
    legend: {
      show: false
    },
    series: [{
      type: 'pie',
      radius: isMobile ? ['40%', '60%'] : ['45%', '70%'],
      center: ['50%', '50%'],
      itemStyle: {
        borderRadius: 4,
        borderColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
        borderWidth: 2
      },
      data: (monthlyData?.income || []).map((item: any) => ({
        name: item.name,
        value: item.amount
      })),
      minAngle: 5,
      label: {
        show: !isMobile,
        position: 'outside',
        fontSize: 12,
        color: resolved === 'dark' ? '#9ca3af' : '#4b5563',
        formatter: (params: any) => {
          if (hideNumbers) return `${params.name}`
          return `${params.name}\n${((params.value / monthlyData.totalIncome) * 100).toFixed(1)}%`
        }
      },
      labelLine: {
        show: !isMobile,
        length: 15,
        length2: 10,
        smooth: true,
        lineStyle: {
          color: resolved === 'dark' ? '#4b5563' : '#d1d5db'
        }
      },
      color: incomeColors
    }]
  }

  const expensesChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: resolved === 'dark' ? '#374151' : '#ffffff',
      borderColor: resolved === 'dark' ? '#4b5563' : '#d1d5db',
      textStyle: {
        color: resolved === 'dark' ? '#f3f4f6' : '#111827'
      },
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
    },
    legend: {
      show: false
    },
    series: [{
      type: 'pie',
      radius: isMobile ? ['40%', '60%'] : ['45%', '70%'],
      center: ['50%', '50%'],
      itemStyle: {
        borderRadius: 4,
        borderColor: resolved === 'dark' ? '#1f2937' : '#ffffff',
        borderWidth: 2
      },
      data: (monthlyData?.expenses || []).map((item: any) => ({
        name: item.name,
        value: item.amount
      })),
      minAngle: 5,
      label: {
        show: !isMobile,
        position: 'outside',
        fontSize: 12,
        color: resolved === 'dark' ? '#9ca3af' : '#4b5563',
        formatter: (params: any) => {
          if (hideNumbers) return `${params.name}`
          return `${params.name}\n${((params.value / monthlyData.totalExpenses) * 100).toFixed(1)}%`
        }
      },
      labelLine: {
        show: !isMobile,
        length: 15,
        length2: 10,
        smooth: true,
        lineStyle: {
          color: resolved === 'dark' ? '#4b5563' : '#d1d5db'
        }
      },
      color: expenseColors
    }]
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-gray-600 dark:text-gray-300">Loading monthly data...</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col p-3 gap-3 ${isMobile ? 'overflow-y-auto hide-scrollbar h-auto min-h-[calc(100vh-4.25rem)]' : 'h-[calc(100vh-4.25rem)] overflow-hidden'}`}>
      {selectedCategory && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-2 flex items-center justify-between shrink-0">
          <div className="text-xs text-blue-800 dark:text-blue-100">Viewing category: <strong className="font-semibold">{selectedCategory}</strong></div>
          <button className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:underline" onClick={() => setSelectedCategory(null)}>Clear filter</button>
        </div>
      )}

      {/* Top Section: Month Selector + Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 shrink-0">
        {/* Month Selector - Takes 1 col */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Selected Month</div>
          <div className="flex items-center justify-between w-full">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-base font-bold text-gray-900 dark:text-white">
              {formatMonthDisplay(selectedMonth)}
            </div>

            <button 
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Cards - Takes 3 cols */}
        {monthlyData && (
          <>
            {/* Income */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Income</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
                  <PrivacyNumber value={monthlyData.totalIncome}>
                    {formatEUR(monthlyData.totalIncome)}
                  </PrivacyNumber>
                </h3>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Expenses</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
                  <PrivacyNumber value={monthlyData.totalExpenses}>
                    {formatEUR(monthlyData.totalExpenses)}
                  </PrivacyNumber>
                </h3>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                </svg>
              </div>
            </div>

            {/* Net Result */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Result</p>
                <h3 className={`text-xl font-bold mt-1 tracking-tight ${monthlyData.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <PrivacyNumber value={monthlyData.netResult}>
                    {monthlyData.netResult > 0 ? '+' : ''}{formatEUR(monthlyData.netResult)}
                  </PrivacyNumber>
                </h3>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {monthlyData && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-3 ${isMobile ? '' : 'min-h-0'}`}>
          
          {/* Income Section */}
          <div className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col ${isMobile ? '' : 'h-full overflow-hidden'}`}>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 shrink-0">Income Breakdown</h3>
            
            <div className="h-[200px] shrink-0">
              <ReactECharts 
                option={incomeChartOption} 
                style={{ height: '100%', width: '100%' }}
                onEvents={{
                  click: handleIncomeChartClick
                }}
              />
            </div>

            <div className={`space-y-2 mt-3 ${isMobile ? '' : 'overflow-y-auto hide-scrollbar flex-1 pr-1'}`}>
              {monthlyData.income.length > 0 ? (
                monthlyData.income.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleIncomeChartClick({data: {name: item.name}})}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: incomeColors[index % incomeColors.length] }}></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        <PrivacyNumber value={item.amount}>
                          {formatEUR(item.amount)}
                        </PrivacyNumber>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {((item.amount / monthlyData.totalIncome) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">No income transactions</div>
              )}
            </div>
          </div>

          {/* Expenses Section */}
          <div className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col ${isMobile ? '' : 'h-full overflow-hidden'}`}>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 shrink-0">Expense Breakdown</h3>
            
            <div className="h-[200px] shrink-0">
              <ReactECharts 
                option={expensesChartOption} 
                style={{ height: '100%', width: '100%' }}
                onEvents={{
                  click: handleExpensesChartClick
                }}
              />
            </div>

            <div className={`space-y-2 mt-3 ${isMobile ? '' : 'overflow-y-auto hide-scrollbar flex-1 pr-1'}`}>
              {monthlyData.expenses.length > 0 ? (
                monthlyData.expenses.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleExpensesChartClick({data: {name: item.name}})}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: expenseColors[index % expenseColors.length] }}></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        <PrivacyNumber value={item.amount}>
                          {formatEUR(item.amount)}
                        </PrivacyNumber>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {((item.amount / monthlyData.totalExpenses) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">No expense transactions</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!monthlyData && !loading && (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center flex-1 flex flex-col justify-center">
          <div className="text-gray-500 dark:text-gray-400 mb-2 text-lg">No data available</div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            There are no transactions recorded for {formatMonthDisplay(selectedMonth)}
          </div>
        </div>
      )}
    </div>
  )
}