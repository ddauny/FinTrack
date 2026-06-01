import { useEffect, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '@/lib/api'
import { useThemeContext } from '@/contexts/ThemeContext'
import { formatEUR } from '@/lib/format'
import { usePrivacy } from '@/contexts/PrivacyContext'
import dayjs from 'dayjs'

import { CategoryTrendTable } from '@/components/reports/CategoryTrendTable'

interface MonthlyData {
  period: string; // "YYYY-MM"
  total_income: number;
  total_expense: number;
}

export function TrendsPage() {
  const { resolved: theme } = useThemeContext()
  const { hideNumbers } = usePrivacy()
  const isDark = theme === 'dark'
  
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'expense' | 'income' | 'savings'>('expense')

  // Table State
  const [referenceMonth, setReferenceMonth] = useState(dayjs().format('YYYY-MM'))
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [categoryLoading, setCategoryLoading] = useState(false)

  useEffect(() => {
    // Fetch all historical data
    api.reports.trends('2000-01-01', dayjs().endOf('year').format('YYYY-MM-DD'))
      .then(data => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCategoryLoading(true)
    const end = dayjs(referenceMonth).endOf('month').format('YYYY-MM-DD')
    const start = dayjs(referenceMonth).subtract(11, 'months').startOf('month').format('YYYY-MM-DD')
    
    api.reports.monthlyCategoryTrends(start, end)
      .then(setCategoryData)
      .catch(console.error)
      .finally(() => setCategoryLoading(false))
  }, [referenceMonth])


  // 1. Annual Overview Data
  const annualData = useMemo(() => {
    const years: Record<string, { income: number, expense: number }> = {}
    
    data.forEach(d => {
      const year = d.period.substring(0, 4)
      if (!years[year]) years[year] = { income: 0, expense: 0 }
      years[year].income += d.total_income
      years[year].expense += Math.abs(d.total_expense)
    })

    return Object.entries(years)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, d]) => ({
        year,
        income: d.income,
        expense: d.expense,
        savings: d.income - d.expense,
        savingsRate: d.income > 0 ? ((d.income - d.expense) / d.income) * 100 : 0
      }))
  }, [data])

  // 2. Monthly Comparison Scenarios (Year over Year)
  const monthlyComparisonOption = useMemo(() => {
    const years = Array.from(new Set(data.map(d => d.period.substring(0, 4)))).sort()
    const months = Array.from({ length: 12 }, (_, i) => dayjs().month(i).format('MMM')) // Jan, Feb...

    const series = years.map(year => {
      const yearData = Array(12).fill(0)
      data.filter(d => d.period.startsWith(year)).forEach(d => {
        const monthIndex = parseInt(d.period.substring(5, 7)) - 1
        if (metric === 'expense') yearData[monthIndex] = Math.abs(d.total_expense)
        else if (metric === 'income') yearData[monthIndex] = d.total_income
        else yearData[monthIndex] = d.total_income - Math.abs(d.total_expense)
      })
      
      return {
        name: year,
        type: 'line',
        smooth: true,
        data: yearData,
        showSymbol: false,
        endLabel: {
            show: true,
            formatter: '{a}',
            color: isDark ? '#e5e5e5' : '#333'
        }
      }
    })

    return {
      title: { 
          text: `Monthly ${metric === 'income' ? 'Income' : metric === 'expense' ? 'Expenses' : 'Savings'} - Year over Year`,
          textStyle: { color: isDark ? '#fff' : '#000', fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#141414' : '#ffffff',
        borderColor: isDark ? '#141414' : '#e5e7eb',
        textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
        formatter: (params: any) => {
            let res = `<div class="font-bold mb-2">${params[0].name}</div>`;
            params.sort((a: any, b: any) => b.value - a.value).forEach((p: any) => {
                const val = hideNumbers ? '••••••' : formatEUR(p.value);
                res += `<div class="flex justify-between items-center gap-4 mb-1">
                    <span class="flex items-center gap-1">${p.marker} ${p.seriesName}</span>
                    <span class="font-mono font-medium">${val}</span>
                </div>`;
            });
            return res;
        }
      },
      legend: { top: 30, textStyle: { color: isDark ? '#ccc' : '#333' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: 80 },
      xAxis: { 
        type: 'category', 
        data: months,
        axisLine: { lineStyle: { color: isDark ? '#555' : '#ccc' } },
        axisLabel: { color: isDark ? '#ccc' : '#333' }
      },
      yAxis: { 
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
        axisLabel: { 
            color: isDark ? '#ccc' : '#333',
            formatter: (val: number) => hideNumbers ? '•••' : (val >= 1000 ? `${(val/1000).toFixed(0)}k` : val)
        }
      },
      series
    }
  }, [data, isDark, metric, hideNumbers])

  // 3. Annual Overview Chart Option
  const annualOption = useMemo(() => {
    return {
        title: { 
            text: 'Annual Overview',
            textStyle: { color: isDark ? '#fff' : '#000', fontSize: 16 }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: isDark ? '#141414' : '#ffffff',
            borderColor: isDark ? '#141414' : '#e5e7eb',
            textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
             formatter: (params: any) => {
                let res = `<div class="font-bold mb-2">${params[0].name}</div>`;
                params.forEach((p: any) => {
                    const val = hideNumbers ? '••••••' : (p.seriesName === 'Savings Rate' ? p.value.toFixed(1) + '%' : formatEUR(p.value));
                    res += `<div class="flex justify-between items-center gap-4 mb-1">
                        <span class="flex items-center gap-1">${p.marker} ${p.seriesName}</span>
                        <span class="font-mono font-medium">${val}</span>
                    </div>`;
                });
                return res;
            }
        },
        legend: { top: 30, textStyle: { color: isDark ? '#ccc' : '#333' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: 80 },
        xAxis: { 
            type: 'category', 
            data: annualData.map(d => d.year),
            axisLine: { lineStyle: { color: isDark ? '#555' : '#ccc' } },
            axisLabel: { color: isDark ? '#ccc' : '#333' }
        },
        yAxis: [
            { 
                type: 'value', 
                name: 'Amount',
                splitLine: { lineStyle: { color: isDark ? '#333' : '#eee' } },
                axisLabel: { color: isDark ? '#ccc' : '#333', formatter: (val: number) => hideNumbers ? '•••' : `${(val/1000).toFixed(0)}k` }
            },
            {
                type: 'value',
                name: 'Savings Rate %',
                min: 0,
                max: 100,
                interval: 20,
                splitLine: { show: false },
                axisLabel: {
                    formatter: '{value} %',
                    color: isDark ? '#ccc' : '#333'
                }
            }
        ],
        series: [
            { name: 'Income', type: 'bar', data: annualData.map(d => d.income), itemStyle: { color: '#10b981' } },
            { name: 'Expenses', type: 'bar', data: annualData.map(d => d.expense), itemStyle: { color: '#ef4444' } },
            { name: 'Savings', type: 'bar', data: annualData.map(d => d.savings), itemStyle: { color: '#3b82f6' } },
            { 
                name: 'Savings Rate', 
                type: 'line', 
                yAxisIndex: 1, 
                data: annualData.map(d => d.savingsRate),
                itemStyle: { color: '#f59e0b' },
                lineStyle: { width: 3 }
            }
        ]
    }
  }, [annualData, isDark, hideNumbers])

  if (loading) return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 dark:bg-[#111111] rounded-lg" />
      {[1,2,3].map(i => <div key={i} className="h-64 bg-white dark:bg-[#111111] rounded-lg border border-slate-200 dark:border-[#1f1f1f]" />)}
    </div>
  )

  return (
    <div className="p-6 w-full space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f0f0f0] tracking-tight">
            Financial Trends
        </h1>
      </div>

      {/* Annual Overview */}
      <div className="bg-white dark:bg-[#111111] p-6 rounded-lg border border-slate-200 dark:border-[#1f1f1f] shadow-sm">
        <ReactECharts option={annualOption} style={{ height: 400 }} />
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-[#111111] p-6 rounded-lg border border-slate-200 dark:border-[#1f1f1f] shadow-sm">
        <div className="flex justify-end mb-4 gap-2">
            {(['income', 'expense', 'savings'] as const).map(m => (
                <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        metric === m 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium' 
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-[#242424] dark:bg-[#1a1a1a]'
                    }`}
                >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
            ))}
        </div>
        <ReactECharts option={monthlyComparisonOption} style={{ height: 450 }} />
      </div>

       {/* Detailed Category Table */}
       <div className="bg-white dark:bg-[#111111] p-6 rounded-lg border border-slate-200 dark:border-[#1f1f1f] shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold dark:text-[#f0f0f0]">Annual Category Breakdown</h2>
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600 dark:text-[#888]">Range Ending:</label>
                <input 
                    type="month" 
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    className="p-2 text-sm border border-slate-300 dark:border-[#282828] rounded-lg bg-slate-50 dark:bg-[#101010] text-slate-900 dark:text-[#f0f0f0] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>
        </div>
        
        {categoryLoading ? (
             <div className="h-64 flex items-center justify-center text-slate-400">Loading breakdown...</div>
        ) : (
             <CategoryTrendTable 
                data={categoryData} 
                startDate={dayjs(referenceMonth).subtract(11, 'months').toDate()}
                endDate={dayjs(referenceMonth).endOf('month').toDate()}
             />
        )}
      </div>

    </div>
  )
}
