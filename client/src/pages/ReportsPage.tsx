import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { formatDateDMY, formatEUR } from '../lib/format'
import { usePrivacy } from '@/contexts/PrivacyContext'
import dayjs from 'dayjs'
import { default as DatePicker } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { PrivacyNumber } from '@/components/PrivacyNumber'

// "Forzatura" del tipo per risolvere l'errore TS(2786)
const DatePickerComponent = DatePicker as any;

export function ReportsPage() {
  const { hideNumbers } = usePrivacy()
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const chartTextColor = isDark ? '#e6eef6' : '#0f172a'
  const gridLineColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
  const axisLineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'
  const navigate = useNavigate()
  const [cashflow, setCashflow] = useState<any[]>([])
  // const [spending, setSpending] = useState<any[]>([]) // Sostituito da spending1
  const [trends, setTrends] = useState<any[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([])
  const [categoryAnalysis, setCategoryAnalysis] = useState<any[]>([])
  const [netWorthTrend, setNetWorthTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // --- MODIFICA: Aggiunti state per la comparazione ---
  const [isCompareMode, setIsCompareMode] = useState(false)
  
  // State per il Periodo 1
  const [startDate1, setStartDate1] = useState(dayjs().startOf('month').toDate())
  const [endDate1, setEndDate1] = useState(dayjs().endOf('month').toDate())
  const [spending1, setSpending1] = useState<any[]>([])

  // State per il Periodo 2 (default al mese precedente)
  const [startDate2, setStartDate2] = useState(dayjs().subtract(1, 'month').startOf('month').toDate())
  const [endDate2, setEndDate2] = useState(dayjs().subtract(1, 'month').endOf('month').toDate())
  const [spending2, setSpending2] = useState<any[]>([])
  // --- FINE MODIFICA ---

  // State per Category Analysis compare mode
  const [isCategoryCompareMode, setIsCategoryCompareMode] = useState(false)
  const [categoryStartDate1, setCategoryStartDate1] = useState(dayjs().startOf('month').toDate())
  const [categoryEndDate1, setCategoryEndDate1] = useState(dayjs().endOf('month').toDate())
  const [categoryStartDate2, setCategoryStartDate2] = useState(dayjs().subtract(1, 'month').startOf('month').toDate())
  const [categoryEndDate2, setCategoryEndDate2] = useState(dayjs().subtract(1, 'month').endOf('month').toDate())
  const [categoryAnalysis1, setCategoryAnalysis1] = useState<any[]>([])
  const [categoryAnalysis2, setCategoryAnalysis2] = useState<any[]>([])

  // Caricamento iniziale per i grafici NON dipendenti dalle date (Cashflow, Trends, etc.)
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const end = dayjs()
        const start = dayjs().subtract(5, 'month')
        
        const startStr = start.startOf('month').format('YYYY-MM-DD')
        const endStr = end.endOf('month').format('YYYY-MM-DD')
        
        const [cashflowData, trendsData, monthlyData, netWorthData] = await Promise.allSettled([
          api.reports.cashflow(startStr, endStr),
          api.reports.trends(startStr, endStr),
          api.reports.monthlyExpenses(startStr, endStr),
          api.reports.netWorthTrend(startStr, endStr)
        ])
        
        if (cashflowData.status === 'fulfilled') setCashflow(cashflowData.value as any[])
        if (trendsData.status === 'fulfilled') setTrends(trendsData.value as any[])
        if (monthlyData.status === 'fulfilled') setMonthlyExpenses(monthlyData.value as any[])
        if (netWorthData.status === 'fulfilled') setNetWorthTrend(netWorthData.value as any[])
        
      } catch (err) {
        console.error('Error loading static reports data:', err)
        setError('Failed to load reports data')
      } finally {
        setLoading(false)
      }
    }
    
    loadStaticData()
  }, [])

  // --- MODIFICA: useEffect aggiornato per caricare i dati per ENTRAMBI i periodi ---
  useEffect(() => {
    const fetchDateDependentData = async () => {
      try {
        setLoading(true) // Imposta loading a true all'inizio

        // Funzione helper per normalizzare le date e chiamare l'API
        // IMPORTANTE: Usiamo startOf('month') e endOf('month') perché il DatePicker seleziona MESI
        const fetchDataForPeriod = async (start: Date, end: Date) => {
          const startStr = dayjs(start).startOf('month').format('YYYY-MM-DD')
          const endStr = dayjs(end).endOf('month').format('YYYY-MM-DD')
          // Non invertire le date - invia sempre start e end corretti
          return api.reports.spendingByCategory(startStr, endStr)
        }
        
        // Funzione helper per Category Analysis (usa sempre il Periodo 1)
        const fetchCategoryAnalysis = async (start: Date, end: Date) => {
          const startStr = dayjs(start).startOf('month').format('YYYY-MM-DD')
          const endStr = dayjs(end).endOf('month').format('YYYY-MM-DD')
          return api.reports.categoryAnalysis(startStr, endStr);
        }

        // Prepara le chiamate API
        const promises: Promise<any>[] = [
          fetchDataForPeriod(startDate1, endDate1),
          fetchCategoryAnalysis(startDate1, endDate1) // Category Analysis si basa su Periodo 1
        ];

        // Aggiungi la chiamata per il Periodo 2 solo se siamo in modalità comparazione
        if (isCompareMode) {
          promises.push(fetchDataForPeriod(startDate2, endDate2));
        }

        const [data1, analysisData, data2] = await Promise.allSettled(promises);

        // Gestisci Risultati
        if (data1.status === 'fulfilled') {
          setSpending1((data1.value as any[]) || [])
        } else {
          console.error('Error loading spending data 1:', data1.reason)
          setSpending1([])
        }

        if (analysisData.status === 'fulfilled') {
          setCategoryAnalysis((analysisData.value as any[]) || [])
        } else {
          console.error('Error loading category analysis data:', analysisData.reason)
          setCategoryAnalysis([])
        }

        if (isCompareMode && data2 && data2.status === 'fulfilled') {
          setSpending2((data2.value as any[]) || [])
        } else if (isCompareMode && data2) {
          setSpending2([])
        } else {
          setSpending2([]) // Pulisci se usciamo dalla modalità compare
        }

      } catch (error) {
        console.error('Error loading date-dependent data:', error)
        setSpending1([])
        setSpending2([])
        setCategoryAnalysis([])
      } finally {
        setLoading(false) // Imposta loading a false alla fine
      }
    }
    
    fetchDateDependentData()
  }, [startDate1, endDate1, startDate2, endDate2, isCompareMode]) // Si aggiorna quando le date o la modalità cambiano
  // --- FINE MODIFICA ---

  // useEffect separato per Category Analysis con i suoi propri state di date
  useEffect(() => {
    const fetchCategoryAnalysisData = async () => {
      try {
        const fetchAnalysisForPeriod = async (start: Date, end: Date) => {
          const startStr = dayjs(start).startOf('month').format('YYYY-MM-DD')
          const endStr = dayjs(end).endOf('month').format('YYYY-MM-DD')
          return api.reports.categoryAnalysis(startStr, endStr)
        }

        const promises: Promise<any>[] = [
          fetchAnalysisForPeriod(categoryStartDate1, categoryEndDate1)
        ]

        if (isCategoryCompareMode) {
          promises.push(fetchAnalysisForPeriod(categoryStartDate2, categoryEndDate2))
        }

        const [data1, data2] = await Promise.allSettled(promises)

        if (data1.status === 'fulfilled') {
          setCategoryAnalysis1((data1.value as any[]) || [])
          // Mantieni anche il vecchio state per retrocompatibilità con categoryAnalysisOption
          setCategoryAnalysis((data1.value as any[]) || [])
        } else {
          console.error('Error loading category analysis 1:', data1.reason)
          setCategoryAnalysis1([])
          setCategoryAnalysis([])
        }

        if (isCategoryCompareMode && data2 && data2.status === 'fulfilled') {
          setCategoryAnalysis2((data2.value as any[]) || [])
        } else {
          setCategoryAnalysis2([])
        }
      } catch (error) {
        console.error('Error loading category analysis:', error)
        setCategoryAnalysis1([])
        setCategoryAnalysis2([])
        setCategoryAnalysis([])
      }
    }

    fetchCategoryAnalysisData()
  }, [categoryStartDate1, categoryEndDate1, categoryStartDate2, categoryEndDate2, isCategoryCompareMode])


  const cashflowOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      valueFormatter: (val: any) => hideNumbers ? '••••••' : formatEUR(val as number),
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor }
    },
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
  
  // --- MODIFICA: Trasformato in una funzione per riutilizzarlo ---
  const createSpendingOption = (spendingData: any[]) => ({
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'item',
      formatter: (params: any) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`,
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor }
    },
    color: palette,
    legend: { show: false }, 
    series: [{
      type: 'pie', radius: ['40%','70%'],
      label: { 
        show: true,
        position: 'outside',
        formatter: '{b}: {d}%',
        color: chartTextColor,
        fontSize: 11
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10
      },
      data: (spendingData && spendingData.length > 0) ? spendingData.map(s=>({ name:s.category, value:s.total })) : [{ name: 'No Data', value: 0 }],
      itemStyle: {
        color: (params: any)=> palette[params.dataIndex % palette.length]
      }
    }]
  })
  // --- FINE MODIFICA ---

  // --- MODIFICA: Rinominato in "1" ---
  const handleSpendingClick1 = (params: any) => {
    if (!params) return
    const categoryName = params.name || (params.data && params.data.name)
    if (!categoryName) return

    const startStr = dayjs(startDate1).startOf('month').format('YYYY-MM-DD')
    const endStr = dayjs(endDate1).endOf('month').format('YYYY-MM-DD')
    
    navigate(`/transactions?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}&category=${encodeURIComponent(categoryName)}&type=Expense`)
  }
  
  // --- MODIFICA: Creato handler per il secondo grafico ---
  const handleSpendingClick2 = (params: any) => {
    if (!params) return
    const categoryName = params.name || (params.data && params.data.name)
    if (!categoryName) return

    const startStr = dayjs(startDate2).startOf('month').format('YYYY-MM-DD')
    const endStr = dayjs(endDate2).endOf('month').format('YYYY-MM-DD')
    
    navigate(`/transactions?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}&category=${encodeURIComponent(categoryName)}&type=Expense`)
  }
  // --- FINE MODIFICA ---


  const trendsOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis',
      valueFormatter: (val: any) => hideNumbers ? '••••••' : formatEUR(val as number),
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
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

  const monthlyExpensesOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      valueFormatter: (val: any) => hideNumbers ? '••••••' : formatEUR(val as number),
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor }
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

  const handleMonthlyExpensesClick = (params: any) => {
    if (params.data && monthlyExpenses) {
      const clickedMonth = monthlyExpenses[params.dataIndex];
      if (clickedMonth) {
        const date = dayjs(clickedMonth.month) 
        const startStr = date.startOf('month').format('YYYY-MM-DD')
        const endStr = date.endOf('month').format('YYYY-MM-DD')
        
        navigate(`/transactions?startDate=${startStr}&endDate=${endStr}&type=Expense`);
      }
    }
  }

  const handleCashflowClick = (params: any) => {
    if (params && params.dataIndex != null && cashflow && cashflow.length > params.dataIndex) {
      const clicked = cashflow[params.dataIndex]
      if (clicked && clicked.period) {
        navigate(`/monthly-summary?month=${encodeURIComponent(clicked.period)}`)
      }
    }
  }

  const handleTrendsClick = (params: any) => {
    if (params && params.dataIndex != null && trends && trends.length > params.dataIndex) {
      const clicked = trends[params.dataIndex]
      if (clicked && clicked.period) {
        navigate(`/monthly-summary?month=${encodeURIComponent(clicked.period)}`)
      }
    }
  }

  const handleNetWorthClick = (params: any) => {
    if (params && params.dataIndex != null && netWorthTrend && netWorthTrend.length > params.dataIndex) {
      const clicked = netWorthTrend[params.dataIndex]
      if (clicked && clicked.period) {
        navigate(`/monthly-summary?month=${encodeURIComponent(clicked.period)}`)
      }
    }
  }

  const categoryAnalysisOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'item', 
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor } 
    },
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

  // Funzione helper per creare opzioni radar per Category Analysis
  const createCategoryAnalysisOption = (data: any[]) => ({
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'item', 
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor } 
    },
    radar: {
      indicator: (data && data.length > 0) ? data.map(c => ({ name: c.category, max: c.maxValue || 1 })) : [{ name: 'No Data', max: 1 }],
      radius: '70%',
      axisLine: { lineStyle: { color: axisLineColor } },
      splitLine: { lineStyle: { color: gridLineColor } },
      name: { textStyle: { color: chartTextColor, fontSize: 10 } }
    },
    series: [{
      type: 'radar',
      data: (data && data.length > 0) ? [{
        value: data.map(c => c.total),
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
  })


  const netWorthTrendOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor }
    },
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

      {/* === MODIFICA INIZIA QUI: Riquadro "Spending by Category" aggiornato === */}
      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Spending by Category</div>
          
          {/* Pulsante Compare */}
          <button 
            onClick={() => setIsCompareMode(!isCompareMode)}
            className={`text-sm px-4 py-2 rounded-md font-medium transition-colors ${
              isCompareMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isCompareMode ? '✓ Compare Mode' : 'Compare Periods'}
          </button>
        </div>

        {/* Contenitore per i DatePicker - migliorato styling */}
        <div className={`flex ${isCompareMode ? 'flex-col lg:flex-row' : 'flex-row'} items-start gap-4 mb-6`}>
          {/* Periodo 1 */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[60px]">
                {isCompareMode ? 'Period 1' : 'Period'}
              </label>
              <div className="flex items-center gap-2">
                <DatePickerComponent
                  selected={startDate1}
                  onChange={(date: Date | null) => { if (date) setStartDate1(date) }}
                  selectsStart
                  startDate={startDate1}
                  endDate={endDate1}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">to</span>
                <DatePickerComponent
                  selected={endDate1}
                  onChange={(date: Date | null) => { if (date) setEndDate1(date) }}
                  selectsEnd
                  startDate={startDate1}
                  endDate={endDate1}
                  minDate={startDate1}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                />
              </div>
            </div>
          </div>

          {/* Periodo 2 (visibile solo in compare mode) */}
          {isCompareMode && (
            <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[60px]">Period 2</label>
                <div className="flex items-center gap-2">
                  <DatePickerComponent
                    selected={startDate2}
                    onChange={(date: Date | null) => { if (date) setStartDate2(date) }}
                    selectsStart
                    startDate={startDate2}
                    endDate={endDate2}
                    dateFormat="MMM yyyy"
                    showMonthYearPicker
                    className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">to</span>
                  <DatePickerComponent
                    selected={endDate2}
                    onChange={(date: Date | null) => { if (date) setEndDate2(date) }}
                    selectsEnd
                    startDate={startDate2}
                    endDate={endDate2}
                    minDate={startDate2}
                    dateFormat="MMM yyyy"
                    showMonthYearPicker
                    className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Area Grafici/Lista */}
        <div className={`grid ${isCompareMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'} gap-6 mt-4`}>
          {isCompareMode ? (
            <>
              {/* --- VISTA COMPARAZIONE: SOLO GRAFICI ALLINEATI --- */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                <h4 className="text-center font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  {dayjs(startDate1).format('MMM YYYY')} - {dayjs(endDate1).format('MMM YYYY')}
                </h4>
                <ReactECharts 
                  option={createSpendingOption(spending1)} 
                  style={{ height: '350px' }}
                  onEvents={{ click: handleSpendingClick1 }}
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                <h4 className="text-center font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  {dayjs(startDate2).format('MMM YYYY')} - {dayjs(endDate2).format('MMM YYYY')}
                </h4>
                <ReactECharts 
                  option={createSpendingOption(spending2)} 
                  style={{ height: '350px' }}
                  onEvents={{ click: handleSpendingClick2 }}
                />
              </div>
            </>
          ) : (
            <>
              {/* --- VISTA NORMALE: LISTA + GRAFICO --- */}
              <div>
                <div className="space-y-2">
                  {spending1 && spending1.length > 0 ? (
                    spending1.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: palette[index % palette.length] }}
                          />
                          <span className="text-sm">{item.category}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          <PrivacyNumber value={item.total}>
                            {formatEUR(item.total)}
                          </PrivacyNumber>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">No spending data</div>
                  )}
                </div>
              </div>
              
              <div>
                <ReactECharts 
                  option={createSpendingOption(spending1)} 
                  style={{ height: '300px' }}
                  onEvents={{ click: handleSpendingClick1 }}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {/* === MODIFICA FINISCE QUI === */}


      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Income vs Expense Trend</div>
          <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/trends')}>Export CSV</button>
        </div>
        <ReactECharts option={trendsOption} style={{height:300}} onEvents={{ click: handleTrendsClick }} />
      </div>
      
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
      
      {/* --- MODIFICA: Spostato Category Analysis in fondo --- */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">Category Analysis</div>
          
          {/* Pulsante Compare */}
          <button 
            onClick={() => setIsCategoryCompareMode(!isCategoryCompareMode)}
            className={`text-sm px-4 py-2 rounded-md font-medium transition-colors ${
              isCategoryCompareMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isCategoryCompareMode ? '✓ Compare Mode' : 'Compare Periods'}
          </button>
        </div>

        {/* Contenitore per i DatePicker - stesso stile di Spending */}
        <div className={`flex ${isCategoryCompareMode ? 'flex-col lg:flex-row' : 'flex-row'} items-start gap-4 mb-6`}>
          {/* Periodo 1 */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[60px]">
                {isCategoryCompareMode ? 'Period 1' : 'Period'}
              </label>
              <div className="flex items-center gap-2">
                <DatePickerComponent
                  selected={categoryStartDate1}
                  onChange={(date: Date | null) => { if (date) setCategoryStartDate1(date) }}
                  selectsStart
                  startDate={categoryStartDate1}
                  endDate={categoryEndDate1}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">to</span>
                <DatePickerComponent
                  selected={categoryEndDate1}
                  onChange={(date: Date | null) => { if (date) setCategoryEndDate1(date) }}
                  selectsEnd
                  startDate={categoryStartDate1}
                  endDate={categoryEndDate1}
                  minDate={categoryStartDate1}
                  dateFormat="MMM yyyy"
                  showMonthYearPicker
                  className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                />
              </div>
            </div>
          </div>

          {/* Periodo 2 (visibile solo in compare mode) */}
          {isCategoryCompareMode && (
            <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[60px]">Period 2</label>
                <div className="flex items-center gap-2">
                  <DatePickerComponent
                    selected={categoryStartDate2}
                    onChange={(date: Date | null) => { if (date) setCategoryStartDate2(date) }}
                    selectsStart
                    startDate={categoryStartDate2}
                    endDate={categoryEndDate2}
                    dateFormat="MMM yyyy"
                    showMonthYearPicker
                    className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">to</span>
                  <DatePickerComponent
                    selected={categoryEndDate2}
                    onChange={(date: Date | null) => { if (date) setCategoryEndDate2(date) }}
                    selectsEnd
                    startDate={categoryStartDate2}
                    endDate={categoryEndDate2}
                    minDate={categoryStartDate2}
                    dateFormat="MMM yyyy"
                    showMonthYearPicker
                    className="border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Area Grafici */}
        {isCategoryCompareMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h4 className="text-center font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {dayjs(categoryStartDate1).format('MMM YYYY')} - {dayjs(categoryEndDate1).format('MMM YYYY')}
              </h4>
              {categoryAnalysis1 && categoryAnalysis1.length > 0 ? (
                <ReactECharts option={createCategoryAnalysisOption(categoryAnalysis1)} style={{height:300}} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No data available
                </div>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h4 className="text-center font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {dayjs(categoryStartDate2).format('MMM YYYY')} - {dayjs(categoryEndDate2).format('MMM YYYY')}
              </h4>
              {categoryAnalysis2 && categoryAnalysis2.length > 0 ? (
                <ReactECharts option={createCategoryAnalysisOption(categoryAnalysis2)} style={{height:300}} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {categoryAnalysis1 && categoryAnalysis1.length > 0 ? (
              <ReactECharts option={createCategoryAnalysisOption(categoryAnalysis1)} style={{height:300}} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No category analysis data available for the selected period
              </div>
            )}
          </>
        )}

        {/* Export CSV Button */}
        <div className="mt-4 flex justify-end">
          <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>{
            const startStr = dayjs(categoryStartDate1).startOf('month').format('YYYY-MM-DD')
            const endStr = dayjs(categoryEndDate1).endOf('month').format('YYYY-MM-DD')
            exportCsv(`/api/reports/category-analysis?start=${startStr}&end=${endStr}`)
          }}>Export CSV (Period 1)</button>
        </div>
      </div>
      
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
  )
}