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

  // State per Category Analysis (usa gli stessi periodi di Spending)
  const [categoryAnalysis1, setCategoryAnalysis1] = useState<any[]>([])
  const [categoryAnalysis2, setCategoryAnalysis2] = useState<any[]>([])

  // State per Asset Charts
  const [assetGrowthTrend, setAssetGrowthTrend] = useState<any[]>([])
  const [assetDistribution, setAssetDistribution] = useState<any[]>([])
  const [assetGroupComparison, setAssetGroupComparison] = useState<any>(null)
  const [topAssetsEvolution, setTopAssetsEvolution] = useState<any>(null)
  const [assetAllocationChanges, setAssetAllocationChanges] = useState<any[]>([])
  const [assetStartDate, setAssetStartDate] = useState(dayjs().subtract(5, 'month').startOf('month').toDate())
  const [assetEndDate, setAssetEndDate] = useState(dayjs().endOf('month').toDate())

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
        // NON settiamo loading globale qui per evitare di bloccare tutta la pagina

        // Funzione helper per normalizzare le date e chiamare l'API
        // IMPORTANTE: Usiamo startOf('month') e endOf('month') perché il DatePicker seleziona MESI
        const fetchDataForPeriod = async (start: Date, end: Date) => {
          const startStr = dayjs(start).startOf('month').format('YYYY-MM-DD')
          const endStr = dayjs(end).endOf('month').format('YYYY-MM-DD')
          // Non invertire le date - invia sempre start e end corretti
          return api.reports.spendingByCategory(startStr, endStr)
        }

        // Prepara le chiamate API
        const promises: Promise<any>[] = [
          fetchDataForPeriod(startDate1, endDate1)
        ];

        // Aggiungi la chiamata per il Periodo 2 solo se siamo in modalità comparazione
        if (isCompareMode) {
          promises.push(fetchDataForPeriod(startDate2, endDate2));
        }

        const [data1, data2] = await Promise.allSettled(promises);

        // Gestisci Risultati
        if (data1.status === 'fulfilled') {
          setSpending1((data1.value as any[]) || [])
        } else {
          console.error('Error loading spending data 1:', data1.reason)
          setSpending1([])
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
      }
    }
    
    fetchDateDependentData()
  }, [startDate1, endDate1, startDate2, endDate2, isCompareMode]) // Si aggiorna quando le date o la modalità cambiano
  // --- FINE MODIFICA ---

  // useEffect separato per Category Analysis (usa gli stessi periodi di Spending by Category)
  useEffect(() => {
    const fetchCategoryAnalysisData = async () => {
      try {
        const fetchAnalysisForPeriod = async (start: Date, end: Date) => {
          const startStr = dayjs(start).startOf('month').format('YYYY-MM-DD')
          const endStr = dayjs(end).endOf('month').format('YYYY-MM-DD')
          return api.reports.categoryAnalysis(startStr, endStr)
        }

        const promises: Promise<any>[] = [
          fetchAnalysisForPeriod(startDate1, endDate1)
        ]

        if (isCompareMode) {
          promises.push(fetchAnalysisForPeriod(startDate2, endDate2))
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

        if (isCompareMode && data2 && data2.status === 'fulfilled') {
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
  }, [startDate1, endDate1, startDate2, endDate2, isCompareMode])

  // useEffect per caricare i dati degli asset
  useEffect(() => {
    const fetchAssetData = async () => {
      try {
        const startStr = dayjs(assetStartDate).startOf('month').format('YYYY-MM-DD')
        const endStr = dayjs(assetEndDate).endOf('month').format('YYYY-MM-DD')
        
        const [growthData, distributionData, comparisonData, topAssetsData, allocationChangesData] = await Promise.allSettled([
          api.reports.assetGrowthTrend(startStr, endStr),
          api.reports.assetDistribution(startStr, endStr),
          api.reports.assetGroupComparison(startStr, endStr),
          api.reports.topAssetsEvolution(startStr, endStr, 5),
          api.reports.assetAllocationChanges(startStr, endStr)
        ])
        
        if (growthData.status === 'fulfilled') setAssetGrowthTrend(growthData.value as any[])
        if (distributionData.status === 'fulfilled') setAssetDistribution(distributionData.value as any[])
        if (comparisonData.status === 'fulfilled') setAssetGroupComparison(comparisonData.value)
        if (topAssetsData.status === 'fulfilled') setTopAssetsEvolution(topAssetsData.value)
        if (allocationChangesData.status === 'fulfilled') setAssetAllocationChanges(allocationChangesData.value as any[])
      } catch (error) {
        console.error('Error loading asset data:', error)
      }
    }
    
    fetchAssetData()
  }, [assetStartDate, assetEndDate])


  const cashflowOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis', 
      axisPointer: { type: 'shadow' },
      valueFormatter: (val: any) => hideNumbers ? '••••••' : formatEUR(val as number),
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor },
      confine: true
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '20%',
      top: '15%',
      containLabel: true
    },
    xAxis: { 
      type: 'category', 
      data: (cashflow && cashflow.length > 0) ? cashflow.map(r=> formatDateDMY(new Date(r.period+'-01'))) : ['No Data'], 
      axisLabel: { 
        color: chartTextColor,
        rotate: 45,
        fontSize: 10,
        interval: 0
      }, 
      axisLine: { lineStyle: { color: axisLineColor } } 
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (hideNumbers) return '••••••';
          if (value >= 1000) return `€${(value/1000).toFixed(0)}k`;
          return `€${value.toFixed(0)}`;
        },
        color: chartTextColor,
        fontSize: 10
      },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    legend: { 
      data: ['Income', 'Expense'], 
      textStyle: { color: chartTextColor },
      top: 0,
      left: 'center'
    },
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
      textStyle: { color: chartTextColor },
      confine: true, // Mantieni tooltip dentro il grafico
      position: function (point: any, params: any, dom: any, rect: any, size: any) {
        // Posiziona tooltip in alto su mobile
        if (size.viewSize[0] < 640) {
          return [10, 10];
        }
        return null;
      }
    },
    legend: { 
      data: ['Income', 'Expense'], 
      textStyle: { color: chartTextColor },
      top: 0,
      left: 'center'
    },
    grid: {
      left: '5%',
      right: '3%',
      bottom: '20%',
      top: '15%',
      containLabel: true
    },
    xAxis: { 
      type: 'category', 
      data: (trends && trends.length > 0) ? trends.map(r=> formatDateDMY(new Date(r.period+'-01'))) : ['No Data'], 
      axisLabel: { 
        color: chartTextColor,
        rotate: 45, // Ruota le etichette su mobile
        fontSize: 10,
        interval: 0 // Mostra tutte le etichette
      }, 
      axisLine: { lineStyle: { color: axisLineColor } } 
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : formatEUR(value),
        color: chartTextColor,
        fontSize: 10
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
      textStyle: { color: chartTextColor },
      confine: true
    },
    grid: { 
      left: '10%', 
      right: '5%', 
      top: '5%', 
      bottom: '5%',
      containLabel: true
    },
    xAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (hideNumbers) return '••••••';
          // Formato abbreviato per mobile
          if (value >= 1000) return `€${(value/1000).toFixed(0)}k`;
          return `€${value.toFixed(0)}`;
        },
        color: chartTextColor,
        fontSize: 10
      },
      splitLine: { lineStyle: { color: gridLineColor } },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: { 
      type: 'category', 
      data: (monthlyExpenses || []).map(e => e.month),
      axisLabel: { 
        fontSize: 10, 
        color: chartTextColor,
        width: 60,
        overflow: 'truncate'
      },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    series: [{
      type: 'bar',
      data: (monthlyExpenses || []).map(e => e.total),
      itemStyle: { color: '#dc2626' },
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => {
          if (hideNumbers) return '••••••';
          const val = params.value;
          if (val >= 1000) return `€${(val/1000).toFixed(1)}k`;
          return `€${val.toFixed(0)}`;
        },
        fontSize: 9,
        color: chartTextColor
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

  // Asset Growth Trend Option
  const assetGrowthTrendOption = {
    textStyle: { color: chartTextColor },
    tooltip: { 
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor },
      formatter: (params: any) => {
        const data = params[0]
        return `${data.name}<br/>${hideNumbers ? '••••••' : formatEUR(data.value)}`
      },
      confine: true
    },
    xAxis: { 
      type: 'category', 
      data: assetGrowthTrend.map(d => dayjs(d.month).format('MMM YYYY')),
      axisLabel: { 
        color: chartTextColor, 
        rotate: 45,
        fontSize: 10,
        interval: 0
      },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : `€${(value/1000).toFixed(0)}k`,
        color: chartTextColor,
        fontSize: 10
      },
      splitLine: { lineStyle: { color: gridLineColor } }
    },
    series: [{
      type: 'line',
      data: assetGrowthTrend.map(d => d.value),
      areaStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
          ]
        }
      },
      lineStyle: { color: '#3b82f6', width: 3 },
      itemStyle: { color: '#3b82f6' },
      smooth: true
    }],
    grid: { left: '5%', right: '3%', bottom: '20%', top: '10%', containLabel: true }
  }

  // Asset Distribution Option
  const assetDistributionOption = {
    textStyle: { color: chartTextColor },
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor },
      formatter: (params: any) => {
        return `${params.name}<br/>${hideNumbers ? '••••••' : formatEUR(params.value)} (${params.percent}%)`
      },
      confine: true
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { color: chartTextColor, fontSize: 10 },
      itemWidth: 15,
      itemHeight: 10
    },
    series: [{
      name: 'Asset Distribution',
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 10,
        borderColor: isDark ? '#1f2937' : '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{d}%',
        color: chartTextColor,
        fontSize: 10,
        position: 'outside'
      },
      labelLine: {
        length: 10,
        length2: 10
      },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: 'bold' }
      },
      data: assetDistribution.map((d, i) => ({
        value: d.value,
        name: d.name,
        itemStyle: {
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6]
        }
      }))
    }]
  }

  // Asset Group Comparison Option
  const assetGroupComparisonOption = assetGroupComparison ? {
    textStyle: { color: chartTextColor },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor },
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${hideNumbers ? '••••••' : formatEUR(p.value)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: assetGroupComparison.series.map((s: any) => s.name),
      textStyle: { color: chartTextColor },
      top: 0
    },
    xAxis: {
      type: 'category',
      data: assetGroupComparison.months.map((m: string) => dayjs(m).format('MMM YYYY')),
      axisLabel: { color: chartTextColor, rotate: 45 },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : `€${(value/1000).toFixed(0)}k`,
        color: chartTextColor
      },
      splitLine: { lineStyle: { color: gridLineColor } }
    },
    series: assetGroupComparison.series.map((s: any, i: number) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: true,
      lineStyle: { width: 2 },
      itemStyle: {
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]
      }
    })),
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true }
  } : {}

  // Top Assets Evolution Option
  const topAssetsEvolutionOption = topAssetsEvolution ? {
    textStyle: { color: chartTextColor },
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
      textStyle: { color: chartTextColor },
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`
        params.forEach((p: any) => {
          result += `${p.marker} ${p.seriesName}: ${hideNumbers ? '••••••' : formatEUR(p.value)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: topAssetsEvolution.series.map((s: any) => s.name),
      textStyle: { color: chartTextColor },
      top: 0,
      type: 'scroll'
    },
    xAxis: {
      type: 'category',
      data: topAssetsEvolution.months.map((m: string) => dayjs(m).format('MMM YYYY')),
      axisLabel: { color: chartTextColor, rotate: 45 },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => hideNumbers ? '••••••' : `€${(value/1000).toFixed(0)}k`,
        color: chartTextColor
      },
      splitLine: { lineStyle: { color: gridLineColor } }
    },
    series: topAssetsEvolution.series.map((s: any, i: number) => ({
      name: s.name,
      type: 'bar',
      stack: 'total',
      data: s.data,
      itemStyle: {
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]
      }
    })),
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true }
  } : {}

  // Asset Allocation Changes Option
  const assetAllocationChangesOption = assetAllocationChanges && assetAllocationChanges.length > 0 ? (() => {
    // Estrai i nomi dei gruppi
    const groupNames = assetAllocationChanges[0].allocations ? Object.keys(assetAllocationChanges[0].allocations) : [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    
    return {
      textStyle: { color: chartTextColor },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        textStyle: { color: chartTextColor },
        formatter: (params: any) => {
          const monthIndex = params[0].dataIndex;
          const monthData = assetAllocationChanges[monthIndex];
          
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${dayjs(monthData.month).format('MMM YYYY')}</div>`;
          
          // Mostra allocazioni
          result += `<div style="margin-bottom: 6px; font-weight: 600; color: ${isDark ? '#94a3b8' : '#64748b'};">Current Allocation:</div>`;
          groupNames.forEach((name, i) => {
            const allocation = monthData.allocations[name] || 0;
            const color = colors[i % colors.length];
            result += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">`;
            result += `<span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 6px;"></span>${name}:</span>`;
            result += `<span style="margin-left: 12px; font-weight: 600;">${allocation.toFixed(1)}%</span>`;
            result += `</div>`;
          });
          
          // Mostra variazioni se disponibili
          if (monthData.changes) {
            result += `<div style="margin-top: 8px; margin-bottom: 4px; font-weight: 600; color: ${isDark ? '#94a3b8' : '#64748b'}; border-top: 1px solid ${isDark ? '#475569' : '#cbd5e1'}; padding-top: 6px;">Change from Previous Month:</div>`;
            groupNames.forEach((name, i) => {
              const change = monthData.changes[name] || 0;
              const color = colors[i % colors.length];
              const changeColor = change > 0 ? '#10b981' : change < 0 ? '#ef4444' : '#6b7280';
              const changeSymbol = change > 0 ? '+' : '';
              result += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">`;
              result += `<span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 6px;"></span>${name}:</span>`;
              result += `<span style="margin-left: 12px; font-weight: 600; color: ${changeColor};">${changeSymbol}${change.toFixed(2)}%</span>`;
              result += `</div>`;
            });
          }
          
          return result;
        }
      },
      legend: {
        data: groupNames,
        textStyle: { color: chartTextColor },
        top: 0,
        type: 'scroll'
      },
      xAxis: {
        type: 'category',
        data: assetAllocationChanges.map(d => dayjs(d.month).format('MMM YYYY')),
        axisLabel: { 
          color: chartTextColor, 
          rotate: 45,
          fontSize: 10,
          interval: 0
        },
        axisLine: { lineStyle: { color: axisLineColor } }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${value.toFixed(0)}%`,
          color: chartTextColor,
          fontSize: 10
        },
        splitLine: { lineStyle: { color: gridLineColor } },
        max: 100
      },
      series: groupNames.map((name, i) => ({
        name: name,
        type: 'line',
        data: assetAllocationChanges.map(d => d.allocations[name] || 0),
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colors[i % colors.length] + '40' },
              { offset: 1, color: colors[i % colors.length] + '10' }
            ]
          }
        },
        itemStyle: {
          color: colors[i % colors.length]
        }
      })),
      grid: { left: '5%', right: '3%', bottom: '20%', top: '15%', containLabel: true }
    };
  })() : {}

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
      {/* Transaction Analytics Section - GREEN */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg shadow-lg border border-green-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-green-600 dark:text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
          </svg>
          Transaction Analytics
        </h2>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Cash Flow</div>
              <button className="text-sm text-blue-700 dark:text-blue-300 whitespace-nowrap" onClick={()=>exportCsv('/api/reports/cashflow')}>Export CSV</button>
            </div>
            <ReactECharts option={cashflowOption} style={{height:300}} onEvents={{ click: handleCashflowClick }} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Income vs Expense Trend</div>
              <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/trends')}>Export CSV</button>
            </div>
            <ReactECharts option={trendsOption} style={{height:300}} onEvents={{ click: handleTrendsClick }} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
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
        </div>
      </div>

      {/* Category Analysis Section - YELLOW/ORANGE */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg shadow-lg border border-amber-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-amber-600 dark:text-amber-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
          </svg>
          Category Analytics
        </h2>

        {/* Unified Period Selection */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period Selection</label>
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

          <div className={`flex ${isCompareMode ? 'flex-col lg:flex-row' : 'flex-row'} items-start gap-4`}>
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
        </div>

        {/* Spending by Category */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow mb-4">
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Spending by Category</div>

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

        {/* Category Analysis */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Category Analysis</div>

        {/* Area Grafici */}
        {isCompareMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h4 className="text-center font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {dayjs(startDate1).format('MMM YYYY')} - {dayjs(endDate1).format('MMM YYYY')}
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
                {dayjs(startDate2).format('MMM YYYY')} - {dayjs(endDate2).format('MMM YYYY')}
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
            const startStr = dayjs(startDate1).startOf('month').format('YYYY-MM-DD')
            const endStr = dayjs(endDate1).endOf('month').format('YYYY-MM-DD')
            exportCsv(`/api/reports/category-analysis?start=${startStr}&end=${endStr}`)
          }}>Export CSV (Period 1)</button>
        </div>
        </div>
      </div>
      
      {/* Net Worth Section - PURPLE */}
      {netWorthTrend && netWorthTrend.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg shadow-lg border border-purple-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-purple-600 dark:text-purple-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            Net Worth Overview
          </h2>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-gray-900 dark:text-gray-100">Net Worth Trend</div>
              <button className="text-sm text-blue-700 dark:text-blue-300" onClick={()=>exportCsv('/api/reports/net-worth-trend')}>Export CSV</button>
            </div>
            <ReactECharts option={netWorthTrendOption} style={{height:300}} onEvents={{ click: handleNetWorthClick }} />
          </div>
        </div>
      )}

      {/* Asset Analytics Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg shadow-lg border border-blue-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-blue-600 dark:text-blue-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          Asset Analytics
        </h2>

        {/* Asset Distribution Chart - MOVED BEFORE PERIOD SELECTOR */}
        {assetDistribution && assetDistribution.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Asset Distribution by Group</h3>
            <ReactECharts option={assetDistributionOption} style={{height:400}} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Current distribution of assets across different groups (latest available data)
            </p>
          </div>
        )}
        
        {/* Date Range Selector for Asset Charts */}
        <div className="mb-6 flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
            <DatePickerComponent
              selected={assetStartDate}
              onChange={(date: Date) => setAssetStartDate(date)}
              dateFormat="MMM yyyy"
              showMonthYearPicker
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <DatePickerComponent
              selected={assetEndDate}
              onChange={(date: Date) => setAssetEndDate(date)}
              dateFormat="MMM yyyy"
              showMonthYearPicker
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
        </div>

        {/* Asset Allocation Changes Chart */}
        {assetAllocationChanges && assetAllocationChanges.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Asset Allocation Changes Over Time</h3>
            <ReactECharts option={assetAllocationChangesOption} style={{height:400}} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Track how your asset allocation percentages change month over month
            </p>
          </div>
        )}

        {/* Asset Growth Trend Chart */}
        {assetGrowthTrend && assetGrowthTrend.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Asset Value Trend</h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {hideNumbers ? '••••••' : formatEUR(assetGrowthTrend[assetGrowthTrend.length - 1]?.value || 0)}
              </div>
            </div>
            <ReactECharts option={assetGrowthTrendOption} style={{height:350}} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Evolution of your total asset value over time
            </p>
          </div>
        )}

        {/* Two-column layout for remaining charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Asset Group Comparison Chart */}
          {assetGroupComparison && assetGroupComparison.series && assetGroupComparison.series.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Asset Groups Comparison</h3>
              <ReactECharts option={assetGroupComparisonOption} style={{height:350}} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Compare growth trends across asset groups
              </p>
            </div>
          )}

          {/* Top Assets Evolution Chart */}
          {topAssetsEvolution && topAssetsEvolution.series && topAssetsEvolution.series.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Top 5 Assets Evolution</h3>
              <ReactECharts option={topAssetsEvolutionOption} style={{height:350}} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Stacked view of your most valuable assets
              </p>
            </div>
          )}
        </div>

        {/* No Data Message */}
        {(!assetGrowthTrend || assetGrowthTrend.length === 0) && 
         (!assetDistribution || assetDistribution.length === 0) && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No asset data available for the selected period</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add some assets in the Assets page to see analytics here</p>
          </div>
        )}
      </div>
    </div>
  )
}