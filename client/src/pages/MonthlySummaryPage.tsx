import { useEffect, useReducer, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { api } from '../lib/api'
import { formatEUR } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useChartTheme } from '@/hooks/useChartTheme'
import dayjs from 'dayjs'

// ═══════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════
interface State {
  selectedMonth: string
  monthlyData: any
  forecastData: any
  loading: boolean
  selectedCategory: string | null
  isMobile: boolean
}

interface ExternalIncomeForecastItem {
  name: string
  icon?: string | null
  color?: string | null
  value: number
  lastUpdated?: string | null
  error?: string | null
}

type Action =
  | { type: 'SET_MONTH'; payload: string }
  | { type: 'SET_DATA'; payload: any }
  | { type: 'SET_FORECAST'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'SET_MOBILE'; payload: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_MONTH': return { ...state, selectedMonth: action.payload }
    case 'SET_DATA': return { ...state, monthlyData: action.payload, loading: false }
    case 'SET_FORECAST': return { ...state, forecastData: action.payload }
    case 'SET_LOADING': return { ...state, loading: action.payload }
    case 'SET_CATEGORY': return { ...state, selectedCategory: action.payload }
    case 'SET_MOBILE': return { ...state, isMobile: action.payload }
    default: return state
  }
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function getMonthRange(monthStr: string) {
  const date = dayjs(monthStr)
  return [date.startOf('month').format('YYYY-MM-DD'), date.endOf('month').format('YYYY-MM-DD')]
}

function formatMonthDisplay(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatUpdatedAgo(lastUpdated?: string | null) {
  if (!lastUpdated) return 'not updated yet'
  const then = dayjs(lastUpdated)
  if (!then.isValid()) return 'unknown'
  const diffMinutes = Math.max(0, dayjs().diff(then, 'minute'))
  if (diffMinutes < 1) return 'updated just now'
  if (diffMinutes < 60) return `updated ${diffMinutes} min ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `updated ${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `updated ${diffDays}d ago`
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════
function MonthSelector({ selectedMonth, handlePrevMonth, handleNextMonth }: {
  selectedMonth: string; handlePrevMonth: () => void; handleNextMonth: () => void
}) {
  return (
    <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col justify-center items-center">
      <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Selected Month</div>
      <div className="flex items-center justify-between w-full">
        <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-500 dark:text-stone-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-base font-bold text-stone-900 dark:text-white">{formatMonthDisplay(selectedMonth)}</div>
        <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-500 dark:text-stone-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function SummaryCards({ monthlyData }: { monthlyData: any }) {
  if (!monthlyData) return null
  return (
    <>
      <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between transition-all hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800">
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Income</p>
          <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 tracking-tight">
            <PrivacyNumber value={monthlyData.totalIncome}>{formatEUR(monthlyData.totalIncome)}</PrivacyNumber>
          </h3>
        </div>
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-600 dark:text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/40 flex items-center justify-between transition-all hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800">
        <div>
          <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider">Total Expenses</p>
          <h3 className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1 tracking-tight">
            <PrivacyNumber value={monthlyData.totalExpenses}>{formatEUR(monthlyData.totalExpenses)}</PrivacyNumber>
          </h3>
        </div>
        <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-rose-500 dark:text-rose-400"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
        </div>
      </div>

      <div className={`bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border flex items-center justify-between transition-all hover:shadow-md ${monthlyData.netResult >= 0 ? 'border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-200 dark:hover:border-emerald-800' : 'border-rose-100 dark:border-rose-900/40 hover:border-rose-200 dark:hover:border-rose-800'}`}>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${monthlyData.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>Net Result</p>
          <h3 className={`text-xl font-bold mt-1 tracking-tight ${monthlyData.netResult >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
            <PrivacyNumber value={monthlyData.netResult}>{monthlyData.netResult > 0 ? '+' : ''}{formatEUR(monthlyData.netResult)}</PrivacyNumber>
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl ${monthlyData.netResult >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-rose-100 dark:bg-rose-900/40'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${monthlyData.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
      </div>
    </>
  )
}

function BreakdownCard({ title, data, totalAmount, chartOption, colors, isMobile, onChartClick }: {
  title: string; data: any[]; totalAmount: number; chartOption: any; colors: string[]; isMobile: boolean; onChartClick: (params: any) => void
}) {
  return (
    <div className={`bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col ${isMobile ? '' : 'h-full overflow-hidden'}`}>
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-3 shrink-0">{title}</h3>
      <div className="h-[200px] shrink-0">
        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} onEvents={{ click: onChartClick }} />
      </div>
      <div className={`space-y-2 mt-3 ${isMobile ? '' : 'overflow-y-auto hide-scrollbar flex-1 pr-1'}`}>
        {data && data.length > 0 ? (
          data.map((item: any, index: number) => (
            <div key={item.name || index} className="flex justify-between items-center p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors cursor-pointer"
              onClick={() => onChartClick({ data: { name: item.name } })}
              onKeyDown={(e) => { if (e.key === 'Enter') onChartClick({ data: { name: item.name } }) }}
              role="button" tabIndex={0}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-stone-900 dark:text-white">
                  <PrivacyNumber value={item.amount}>{formatEUR(item.amount)}</PrivacyNumber>
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">{((item.amount / totalAmount) * 100).toFixed(1)}%</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-stone-500 text-center py-8">No transactions</div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, color, suffix, isSavings }: {
  label: string; value: number; color: string; suffix?: string; isSavings?: boolean
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40',
  }
  const display = isSavings ? `${value}%` : formatEUR(value)
  return (
    <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.blue}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-0.5">{label}</p>
      <p className="text-base font-bold"><PrivacyNumber value={value}>{display}</PrivacyNumber></p>
    </div>
  )
}

function ForecastRow({ label, value, color, icon, dashed, bold }: {
  label: string; value: number; color: string; icon: string; dashed?: boolean; bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} text-stone-700 dark:text-stone-200 ${dashed ? 'opacity-70' : ''}`}>{label}</span>
      </div>
      <div className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} ${dashed ? 'opacity-70' : ''}`}>
        <PrivacyNumber value={value}>{formatEUR(value)}</PrivacyNumber>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════
export function MonthlySummaryPage() {
  const { hideNumbers } = usePrivacy()
  const ct = useChartTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [state, dispatch] = useReducer(reducer, {
    selectedMonth: getCurrentMonth(),
    monthlyData: null,
    forecastData: null,
    loading: false,
    selectedCategory: null,
    isMobile: window.innerWidth < 768,
  })

  const { selectedMonth, monthlyData, forecastData, loading, selectedCategory, isMobile } = state
  const monthlyRequestRef = useRef(0)
  const forecastRequestRef = useRef(0)



  useEffect(() => {
    const handleResize = () => dispatch({ type: 'SET_MOBILE', payload: window.innerWidth < 768 })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load monthly transaction data when month changes
  useEffect(() => {
    const loadMonthlyData = async () => {
      const requestId = ++monthlyRequestRef.current
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const [startDate, endDate] = getMonthRange(selectedMonth)
        const query = `?startDate=${startDate}&endDate=${endDate}&limit=1000`
        const res = await api.transactions.list(query)
        if (requestId !== monthlyRequestRef.current) return
        const transactions = (res as any).items || []

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

        const incomeArray = Array.from(income.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
        const expensesArray = Array.from(expenses.entries()).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
        const totalIncome = incomeArray.reduce((sum, item) => sum + item.amount, 0)
        const totalExpenses = expensesArray.reduce((sum, item) => sum + item.amount, 0)

        dispatch({
          type: 'SET_DATA', payload: {
            income: incomeArray,
            expenses: expensesArray,
            totalIncome,
            totalExpenses,
            netResult: totalIncome - totalExpenses,
          }
        })
      } catch (error) {
        if (requestId !== monthlyRequestRef.current) return
        console.error('Error loading monthly data:', error)
        dispatch({ type: 'SET_DATA', payload: null })
      }
    }
    loadMonthlyData()
  }, [selectedMonth])

  // Load forecast data for the selected month
  useEffect(() => {
    const requestId = ++forecastRequestRef.current
    dispatch({ type: 'SET_FORECAST', payload: null })
    api.forecast.monthlyForecast(selectedMonth)
      .then(data => {
        if (requestId !== forecastRequestRef.current) return
        dispatch({ type: 'SET_FORECAST', payload: data })
      })
      .catch(err => {
        if (requestId !== forecastRequestRef.current) return
        console.error('Error loading forecast:', err)
        dispatch({ type: 'SET_FORECAST', payload: null })
      })
  }, [selectedMonth])

  // Parse query params for deep-linking
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const m = params.get('month')
      if (m) {
        if (/^\d{4}-\d{2}$/.test(m)) {
          dispatch({ type: 'SET_MONTH', payload: m })
        } else {
          try {
            const normalized = dayjs(m).format('YYYY-MM')
            if (/^\d{4}-\d{2}$/.test(normalized)) dispatch({ type: 'SET_MONTH', payload: normalized })
          } catch { /* ignore */ }
        }
      }
      const c = params.get('category')
      if (c) dispatch({ type: 'SET_CATEGORY', payload: c })
    } catch { /* ignore */ }
  }, [location.search])

  const handleChartClick = (type: string) => (params: any) => {
    if (params.data && monthlyData) {
      const clickedCategory = params.data.name
      const [startDate, endDate] = getMonthRange(selectedMonth)
      navigate(`/transactions?startDate=${startDate}&endDate=${endDate}&category=${encodeURIComponent(clickedCategory)}&type=${type}`)
    }
  }

  const handlePrevMonth = () => dispatch({ type: 'SET_MONTH', payload: dayjs(selectedMonth).subtract(1, 'month').format('YYYY-MM') })
  const handleNextMonth = () => dispatch({ type: 'SET_MONTH', payload: dayjs(selectedMonth).add(1, 'month').format('YYYY-MM') })

  const incomeColors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#0ea5e9']
  const expenseColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#f43f5e', '#d946ef']

  const getChartOption = (data: any[], total: number, colors: string[]) => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: ct.tooltipBg,
      borderColor: ct.tooltipBorder,
      textStyle: { color: ct.tooltipText },
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: isMobile ? ['40%', '60%'] : ['45%', '70%'],
      center: ['50%', '50%'],
      itemStyle: { borderRadius: 4, borderColor: ct.pieBorder, borderWidth: 2 },
      data: (data || []).map((item: any) => ({ name: item.name, value: item.amount })),
      minAngle: 5,
      label: {
        show: !isMobile,
        position: 'outside',
        fontSize: 12,
        color: ct.axisLabel,
        formatter: (params: any) => hideNumbers ? `${params.name}` : `${params.name}\n${((params.value / total) * 100).toFixed(1)}%`
      },
      labelLine: { show: !isMobile, length: 15, length2: 10, smooth: true, lineStyle: { color: ct.tooltipBorder } },
      color: colors
    }]
  })

  // Forecast-specific chart options
  const cumulativeChartOption = forecastData?.dailyCumulative?.length > 1 ? {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: ct.tooltipBg,
      borderColor: ct.tooltipBorder,
      textStyle: { color: ct.tooltipText, fontSize: 12 },
      formatter: (params: any) => {
        if (hideNumbers) return `Day ${params[0]?.axisValue}`
        const lines = params.map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${formatEUR(p.value)}`)
        return `<strong>Day ${params[0]?.axisValue}</strong><br/>${lines.join('<br/>')}`
      },
    },
    grid: { left: 12, right: 12, top: 16, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: forecastData.dailyCumulative.map((d: any) => d.day),
      axisLabel: { color: ct.axisLabel, fontSize: 10 },
      axisLine: { lineStyle: { color: ct.axisLine } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { color: ct.axisLabel, fontSize: 10, formatter: (v: number) => hideNumbers ? '***' : `${(v / 1000).toFixed(1)}k` },
      splitLine: { lineStyle: { color: ct.splitLine } },
    },
    series: [
      {
        name: 'Expenses', type: 'line',
        data: forecastData.dailyCumulative.map((d: any) => d.expenses),
        smooth: true, lineStyle: { width: 2.5 }, itemStyle: { color: '#f43f5e' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(244,63,94,0.18)' }, { offset: 1, color: 'rgba(244,63,94,0.02)' }] } },
        symbol: 'none',
      },
      {
        name: 'Income', type: 'line',
        data: forecastData.dailyCumulative.map((d: any) => d.income),
        smooth: true, lineStyle: { width: 2.5 }, itemStyle: { color: '#10b981' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.18)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }] } },
        symbol: 'none',
      },
    ],
  } : null

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="text-stone-600 dark:text-stone-300">Loading monthly data...</div>
      </div>
    )
  }

  // Forecast computed values
  const fd = forecastData
  const monthProgress = fd ? Math.round((fd.daysPassed / fd.daysInMonth) * 100) : 0
  const externalIncomeItems: ExternalIncomeForecastItem[] = (fd?.externalIncome || [])
  const totalExternalIncome = fd?.totalExternalIncome || 0
  const totalForecastIncome = fd ? fd.actualIncome + fd.projectedIncome + totalExternalIncome : 0
  const totalForecastExpenses = fd ? fd.actualExpenses + fd.projectedExpenses : 0
  const incomeChange = fd && fd.prevMonthIncome > 0
    ? Math.round(((totalForecastIncome - fd.prevMonthIncome) / fd.prevMonthIncome) * 100) : null
  const expenseChange = fd && fd.prevMonthExpenses > 0
    ? Math.round(((totalForecastExpenses - fd.prevMonthExpenses) / fd.prevMonthExpenses) * 100) : null

  return (
    <div className="h-full overflow-y-auto hide-scrollbar">
      <div className="flex flex-col p-3 gap-3 max-w-7xl mx-auto">

        {selectedCategory && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-2 flex items-center justify-between shrink-0">
            <div className="text-xs text-blue-800 dark:text-blue-100">Viewing category: <strong className="font-semibold">{selectedCategory}</strong></div>
            <button className="text-xs font-medium text-blue-600 dark:text-blue-300 hover:underline" onClick={() => dispatch({ type: 'SET_CATEGORY', payload: null })}>Clear filter</button>
          </div>
        )}

        {/* ── Month Selector + Summary Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 shrink-0">
          <MonthSelector selectedMonth={selectedMonth} handlePrevMonth={handlePrevMonth} handleNextMonth={handleNextMonth} />
          <SummaryCards monthlyData={monthlyData} />
        </div>

        {/* ── Forecast Section (current month only) ── */}
        {fd && (
          <>
            {/* Month progress bar */}
            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">📆 Month Progress</h3>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                  Day {fd.daysPassed} of {fd.daysInMonth}
                </span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2.5">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${monthProgress}%` }} />
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{monthProgress}% of the month completed</p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Actual Income" value={fd.actualIncome} color="emerald" />
              <KpiCard label="Actual Expenses" value={fd.actualExpenses} color="rose" />
              <KpiCard label="Avg Daily Spending" value={fd.avgDailySpending} color="amber" />
              <KpiCard label="Savings Rate" value={fd.savingsRate} color="blue" suffix="%" isSavings />
            </div>

            {/* Actual vs Projected */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Income */}
              <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/40">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Income</h4>
                  {incomeChange !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${incomeChange >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
                      {incomeChange >= 0 ? '↑' : '↓'} {Math.abs(incomeChange)}% vs prev
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <ForecastRow label="Actual (recorded)" value={fd.actualIncome} color="emerald" icon="✅" />
                  <ForecastRow label="Projected (recurring)" value={fd.projectedIncome} color="emerald" icon="🔮" dashed />
                  {externalIncomeItems.map((item, idx) => (
                    <div key={`${item.name}-${idx}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{item.icon || '📡'}</span>
                        <span className="text-sm font-medium truncate" style={{ color: item.color || undefined }}>
                          {item.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-300">
                          {formatUpdatedAgo(item.lastUpdated)}
                        </span>
                        {item.error && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-300" title={item.error}>⚠️</span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <PrivacyNumber value={item.value}>{formatEUR(item.value)}</PrivacyNumber>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-stone-200 dark:border-stone-700 pt-2">
                    <ForecastRow label="Total estimated" value={totalForecastIncome} color="emerald" icon="📊" bold />
                  </div>
                </div>
              </div>
              {/* Expenses */}
              <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/40">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Expenses</h4>
                  {expenseChange !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${expenseChange <= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
                      {expenseChange >= 0 ? '↑' : '↓'} {Math.abs(expenseChange)}% vs prev
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <ForecastRow label="Actual (recorded)" value={fd.actualExpenses} color="rose" icon="✅" />
                  <ForecastRow label="Projected (recurring)" value={fd.projectedExpenses} color="rose" icon="🔮" dashed />
                  <div className="border-t border-stone-200 dark:border-stone-700 pt-2">
                    <ForecastRow label="Total estimated" value={totalForecastExpenses} color="rose" icon="📊" bold />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Income & Expense Breakdown ── */}
        {monthlyData && (
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-3 ${isMobile ? '' : 'min-h-0'}`}>
            <BreakdownCard title="Income Breakdown" data={monthlyData.income} totalAmount={monthlyData.totalIncome}
              chartOption={getChartOption(monthlyData.income, monthlyData.totalIncome, incomeColors)}
              colors={incomeColors} isMobile={isMobile} onChartClick={handleChartClick('Income')} />
            <BreakdownCard title="Expense Breakdown" data={monthlyData.expenses} totalAmount={monthlyData.totalExpenses}
              chartOption={getChartOption(monthlyData.expenses, monthlyData.totalExpenses, expenseColors)}
              colors={expenseColors} isMobile={isMobile} onChartClick={handleChartClick('Expense')} />
          </div>
        )}

        {/* ── Forecast charts (current month only) ── */}
        {fd && (
          <>
            {/* Cumulative chart */}
            {cumulativeChartOption && (
              <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Cumulative Income vs Expenses</h4>
                <ReactECharts option={cumulativeChartOption} style={{ height: 200 }} opts={{ renderer: 'svg' }} />
              </div>
            )}

            {/* Estimated Balance */}
            <div className={`bg-white dark:bg-stone-800 p-5 rounded-2xl shadow-sm border flex flex-col justify-center ${fd.estimatedBalance >= 0
              ? 'border-emerald-200 dark:border-emerald-900/40'
              : 'border-rose-200 dark:border-rose-900/40'
              }`}>
              <div className="text-center">
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Estimated Monthly Balance</p>
                <div className={`text-3xl font-bold ${fd.estimatedBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}>
                  <PrivacyNumber value={fd.estimatedBalance}>
                    {fd.estimatedBalance > 0 ? '+' : ''}{formatEUR(fd.estimatedBalance)}
                  </PrivacyNumber>
                </div>
                {fd.prevMonthBalance !== undefined && fd.prevMonthBalance !== 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                    Last month: <span className={`font-semibold ${fd.prevMonthBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <PrivacyNumber value={fd.prevMonthBalance}>{fd.prevMonthBalance > 0 ? '+' : ''}{formatEUR(fd.prevMonthBalance)}</PrivacyNumber>
                    </span>
                  </p>
                )}
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Based on recorded transactions + scheduled recurring items</p>
              </div>
            </div>
          </>
        )}

        {!monthlyData && !loading && (
          <div className="bg-white dark:bg-stone-800 p-12 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 text-center flex-1 flex flex-col justify-center">
            <div className="text-stone-500 dark:text-stone-400 mb-2 text-lg">No data available</div>
            <div className="text-sm text-stone-400 dark:text-stone-500">
              There are no transactions recorded for {formatMonthDisplay(selectedMonth)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}