import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { formatEUR } from '@/lib/format'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useThemeContext } from '@/contexts/ThemeContext'

interface MonthlyTrendData {
  year: number
  month: number
  categoryId: number
  categoryName: string
  categoryType: 'Income' | 'Expense'
  total: number
  period: string
}

interface CategoryTrendTableProps {
  data: MonthlyTrendData[]
  startDate: Date
  endDate: Date
}

export function CategoryTrendTable({ data, startDate, endDate }: CategoryTrendTableProps) {
  const { hideNumbers } = usePrivacy()
  const { resolved: theme } = useThemeContext()
  const isDark = theme === 'dark'

  // Generate array of 12 months identifiers for columns
  const months = useMemo(() => {
    const list = []
    let current = dayjs(startDate).startOf('month')
    const end = dayjs(endDate).endOf('month')

    while (current.isBefore(end) || current.isSame(end, 'month')) {
      list.push({
        key: current.format('YYYY-MM'),
        label: current.format('MMM'),
        fullDate: current
      })
      current = current.add(1, 'month')
    }
    return list
  }, [startDate, endDate])

  const processData = (type: 'Income' | 'Expense') => {
    const typeData = data.filter(d => d.categoryType === type)
    
    // Get unique categories
    const categories = Array.from(new Set(typeData.map(d => d.categoryName))).sort()

    // Build rows
    const rows = categories.map(cat => {
      const catData = typeData.filter(d => d.categoryName === cat)
      const values: Record<string, number> = {}
      let rowTotal = 0
      
      months.forEach(m => {
        const entry = catData.find(d => d.period === m.key)
        const val = entry ? Math.abs(entry.total) : 0
        values[m.key] = val
        rowTotal += val
      })

      return {
        category: cat,
        values,
        total: rowTotal,
        average: rowTotal / (months.length || 1)
      }
    })

    // Sort by total descending
    rows.sort((a, b) => b.total - a.total)

    // Calculate column totals
    const columnTotals: Record<string, number> = {}
    let grandTotal = 0

    months.forEach(m => {
      const colSum = rows.reduce((sum, row) => sum + (row.values[m.key] || 0), 0)
      columnTotals[m.key] = colSum
      grandTotal += colSum
    })

    const grandAverage = grandTotal / (months.length || 1)

    return { rows, columnTotals, grandTotal, grandAverage }
  }

  const income = useMemo(() => processData('Income'), [data, months])
  const expenses = useMemo(() => processData('Expense'), [data, months])

  const renderTable = (title: string, stats: ReturnType<typeof processData>) => (
    <div className="mb-8 overflow-x-auto">
      <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-[#f0f0f0]">{title}</h3>
      <table className="w-full text-sm border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-100 dark:bg-[#111111] border-b border-slate-200 dark:border-[#1f1f1f]">
            <th className="p-3 text-left font-semibold text-slate-600 dark:text-[#bbb] w-48 sticky left-0 bg-slate-100 dark:bg-[#111111] z-10">
              Category
            </th>
            {months.map(m => (
              <th key={m.key} className="p-3 text-right font-semibold text-slate-600 dark:text-[#bbb] min-w-[80px]">
                {m.label}
              </th>
            ))}
            <th className="p-3 text-right font-bold text-slate-800 dark:text-[#f0f0f0] border-l border-slate-200 dark:border-[#1f1f1f] w-32 bg-slate-50 dark:bg-[#111111]">
              Total
            </th>
            <th className="p-3 text-right font-semibold text-slate-600 dark:text-[#bbb] w-24">
              Avg
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {stats.rows.map(row => (
            <tr key={row.category} className="hover:bg-slate-50 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors">
              <td className="p-3 font-medium text-slate-700 dark:text-[#bbb] sticky left-0 bg-white dark:bg-[#101010] z-10">
                {row.category}
              </td>
              {months.map(m => (
                <td key={m.key} className="p-3 text-right text-slate-600 dark:text-[#888]">
                  {row.values[m.key] === 0 ? '-' : hideNumbers ? '•••' : formatEUR(row.values[m.key])}
                </td>
              ))}
              <td className="p-3 text-right font-bold text-slate-800 dark:text-[#d8d8d8] border-l border-slate-200 dark:border-[#1f1f1f] bg-slate-50 dark:bg-[#101010]/50">
                {hideNumbers ? '•••' : formatEUR(row.total)}
              </td>
              <td className="p-3 text-right text-slate-500 dark:text-[#666]">
                {hideNumbers ? '•••' : formatEUR(row.average)}
              </td>
            </tr>
          ))}
          {/* Grand Totals */}
          <tr className="bg-slate-100 dark:bg-[#111111] font-bold border-t-2 border-slate-300 dark:border-[#282828]">
            <td className="p-3 text-slate-800 dark:text-[#f0f0f0] sticky left-0 bg-slate-100 dark:bg-[#111111] z-10">
              Grand Total
            </td>
            {months.map(m => (
              <td key={m.key} className="p-3 text-right text-slate-800 dark:text-[#f0f0f0]">
                {hideNumbers ? '•••' : formatEUR(stats.columnTotals[m.key])}
              </td>
            ))}
            <td className="p-3 text-right text-slate-900 dark:text-[#f0f0f0] border-l border-slate-300 dark:border-[#282828] bg-slate-200 dark:bg-[#111111]">
              {hideNumbers ? '•••' : formatEUR(stats.grandTotal)}
            </td>
            <td className="p-3 text-right text-slate-800 dark:text-[#f0f0f0]">
             {hideNumbers ? '•••' : formatEUR(stats.grandAverage)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="bg-white dark:bg-[#101010] rounded-lg shadow-sm border border-slate-200 dark:border-[#1f1f1f] p-6">
       {renderTable('Income', income)}
       {renderTable('Expenses', expenses)}
    </div>
  )
}
