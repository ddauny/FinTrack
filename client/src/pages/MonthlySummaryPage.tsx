import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatEUR, formatDateDMY } from '@/lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'
import dayjs from 'dayjs'

export function MonthlySummaryPage() {
  const { hideNumbers } = usePrivacy()
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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
          } else {
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

  // Chart options
  const incomeChartOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: (monthlyData?.income || []).map((item: any) => ({
        name: item.name,
        value: item.amount
      })),
      label: {
        show: true,
        position: 'outside',
        fontSize: 11,
        formatter: (params: any) => {
          if (hideNumbers) return `${params.name}: ••••••`
          return `${params.name}: ${formatEUR(params.value)}`
        }
      },
      labelLine: {
        show: true,
        length: 10,
        length2: 20,
        smooth: true
      },
      itemStyle: {
        color: (params: any) => {
          const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#a78bfa', '#22c55e', '#14b8a6', '#0ea5e9', '#84cc16']
          return colors[params.dataIndex % colors.length]
        }
      }
    }]
  }

  const expensesChartOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: (monthlyData?.expenses || []).map((item: any) => ({
        name: item.name,
        value: item.amount
      })),
      label: {
        show: true,
        position: 'outside',
        fontSize: 11,
        formatter: (params: any) => {
          if (hideNumbers) return `${params.name}: ••••••`
          return `${params.name}: ${formatEUR(params.value)}`
        }
      },
      labelLine: {
        show: true,
        length: 10,
        length2: 20,
        smooth: true
      },
      itemStyle: {
        color: (params: any) => {
          const colors = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444']
          return colors[params.dataIndex % colors.length]
        }
      }
    }]
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-gray-600">Loading monthly data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <div className="text-lg font-semibold">
            {formatMonthDisplay(selectedMonth)}
          </div>
        </div>
      </div>

      {monthlyData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-600">Total Income</div>
              <div className="text-2xl font-bold text-green-600">
                <PrivacyNumber value={monthlyData.totalIncome}>
                  {formatEUR(monthlyData.totalIncome)}
                </PrivacyNumber>
              </div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-600">Total Expenses</div>
              <div className="text-2xl font-bold text-red-600">
                <PrivacyNumber value={monthlyData.totalExpenses}>
                  {formatEUR(monthlyData.totalExpenses)}
                </PrivacyNumber>
              </div>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-600">Net Result</div>
              <div className={`text-2xl font-bold ${monthlyData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <PrivacyNumber value={monthlyData.netResult}>
                  {formatEUR(monthlyData.netResult)}
                </PrivacyNumber>
              </div>
            </div>
          </div>

          {/* Income and Expenses Tables with Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Section */}
            <div className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-green-600">INCOME</h3>
                <div className="text-sm font-medium">
                  <PrivacyNumber value={monthlyData.totalIncome}>
                    TOTAL: {formatEUR(monthlyData.totalIncome)}
                  </PrivacyNumber>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Income Table */}
                <div>
                  <div className="space-y-2">
                    {monthlyData.income.length > 0 ? (
                      monthlyData.income.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            </div>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            <PrivacyNumber value={item.amount}>
                              {formatEUR(item.amount)}
                            </PrivacyNumber>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">No income transactions</div>
                    )}
                  </div>
                </div>

                {/* Income Chart */}
                <div>
                  <ReactECharts 
                    option={incomeChartOption} 
                    style={{ height: '300px' }}
                    onEvents={{
                      click: handleIncomeChartClick
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-600">EXPENSES</h3>
                <div className="text-sm font-medium">
                  <PrivacyNumber value={monthlyData.totalExpenses}>
                    TOTAL: {formatEUR(monthlyData.totalExpenses)}
                  </PrivacyNumber>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Expenses Table */}
                <div>
                  <div className="space-y-2">
                    {monthlyData.expenses.length > 0 ? (
                      monthlyData.expenses.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                            </div>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="text-sm font-medium text-red-600">
                            <PrivacyNumber value={item.amount}>
                              {formatEUR(item.amount)}
                            </PrivacyNumber>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">No expense transactions</div>
                    )}
                  </div>
                </div>

                {/* Expenses Chart */}
                <div>
                  <ReactECharts 
                    option={expensesChartOption} 
                    style={{ height: '300px' }}
                    onEvents={{
                      click: handleExpensesChartClick
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!monthlyData && !loading && (
        <div className="bg-white p-8 rounded shadow text-center">
          <div className="text-gray-500 mb-4">No data available for the selected month</div>
          <div className="text-sm text-gray-400">
            Make sure you have transactions in {formatMonthDisplay(selectedMonth)}
          </div>
        </div>
      )}
    </div>
  )
}
