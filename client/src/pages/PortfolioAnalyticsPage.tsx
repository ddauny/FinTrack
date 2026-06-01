import React, { useEffect, useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

const isDark = () => document.documentElement.classList.contains('dark')

// Color palette
const PALETTE = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#14b8a6','#f97316']

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-[#666]">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${color || 'text-slate-900 dark:text-[#f0f0f0]'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-[#666]">{sub}</p>}
    </div>
  )
}

export function PortfolioAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(isDark())

  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setLoading(true)
    api.reports.portfolioAnalytics()
      .then((d: any) => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load portfolio data'); setLoading(false) })
  }, [])

  const textColor = dark ? '#aaa' : '#64748b'
  const gridColor = dark ? '#1f1f1f' : '#f1f5f9'
  const bgColor = dark ? '#111111' : '#ffffff'
  const borderColor = dark ? '#1f1f1f' : '#e2e8f0'

  // --- Treemap chart ---
  const treemapOption = useMemo(() => {
    if (!data?.treemapData) return {}
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: any) => `<b>${p.name}</b><br/>${fmt(p.value)}`
      },
      series: [{
        type: 'treemap',
        roam: false,
        nodeClick: false,
        width: '100%',
        height: '100%',
        breadcrumb: { show: false },
        label: { show: true, formatter: '{b}', color: '#fff', fontSize: 12, fontWeight: 600 },
        upperLabel: { show: true, height: 28, color: '#fff', fontSize: 11, fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.3)' },
        levels: [
          { itemStyle: { borderColor: dark ? '#0a0a0a' : '#f8fafc', borderWidth: 3, gapWidth: 3 }, upperLabel: { show: true } },
          { itemStyle: { borderColor: dark ? '#111' : '#fff', borderWidth: 2, gapWidth: 2 } }
        ],
        colorMappingBy: 'index',
        color: PALETTE,
        data: data.treemapData
      }]
    }
  }, [data, dark])

  // --- Contribution vs Valuation line chart ---
  const lineOption = useMemo(() => {
    if (!data?.contributionGrowth?.length) return {}
    const months = data.contributionGrowth.map((d: any) => d.month)
    const contributions = data.contributionGrowth.map((d: any) => d.contribution)
    const valuations = data.contributionGrowth.map((d: any) => d.valuation)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: dark ? '#1a1a1a' : '#fff',
        borderColor: dark ? '#282828' : '#e2e8f0',
        textStyle: { color: dark ? '#e8e8e8' : '#1e293b', fontSize: 12 },
        formatter: (params: any) => {
          const m = params[0].axisValue
          return `<b>${m}</b><br/>${params.map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${fmt(p.value)}`).join('<br/>')}`
        }
      },
      legend: { data: ['Contributed', 'Valuation'], textStyle: { color: textColor }, top: 0 },
      grid: { top: 36, left: 16, right: 16, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: months, axisLabel: { color: textColor, fontSize: 10, rotate: 30 }, axisLine: { lineStyle: { color: gridColor } } },
      yAxis: { type: 'value', axisLabel: { color: textColor, fontSize: 10, formatter: (v: number) => `€${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: gridColor } } },
      series: [
        {
          name: 'Contributed',
          type: 'line',
          data: contributions,
          smooth: true,
          lineStyle: { color: '#6366f1', width: 2 },
          itemStyle: { color: '#6366f1' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0)' }] } }
        },
        {
          name: 'Valuation',
          type: 'line',
          data: valuations,
          smooth: true,
          lineStyle: { color: '#10b981', width: 2 },
          itemStyle: { color: '#10b981' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.2)' }, { offset: 1, color: 'rgba(16,185,129,0)' }] } }
        }
      ]
    }
  }, [data, dark, textColor, gridColor])

  // --- Correlation heatmap ---
  const correlationOption = useMemo(() => {
    if (!data?.correlationMatrix) return {}
    const names = Object.keys(data.correlationMatrix)
    if (names.length === 0) return {}
    const heatData: [number, number, number][] = []
    names.forEach((r, ri) => names.forEach((c, ci) => {
      heatData.push([ci, ri, parseFloat((data.correlationMatrix[r][c] ?? 0).toFixed(2))])
    }))
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: any) => `${names[p.data[1]]} / ${names[p.data[0]]}: <b>${p.data[2]}</b>`
      },
      grid: { top: 8, left: 8, right: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: names, axisLabel: { color: textColor, fontSize: 10, rotate: 30 }, axisLine: { show: false }, splitLine: { show: false } },
      yAxis: { type: 'category', data: names, axisLabel: { color: textColor, fontSize: 10 }, axisLine: { show: false }, splitLine: { show: false } },
      visualMap: {
        min: -1, max: 1, show: false,
        inRange: { color: ['#ef4444', '#f8fafc', '#10b981'] }
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: { show: true, color: '#333', fontSize: 9 },
        itemStyle: { borderColor: dark ? '#111' : '#fff', borderWidth: 2 }
      }]
    }
  }, [data, dark, textColor])

  // --- Bar chart: asset group values ---
  const barOption = useMemo(() => {
    if (!data?.treemapData) return {}
    const sorted = [...data.treemapData].sort((a: any, b: any) => b.value - a.value)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (p: any) => `<b>${p.name}</b><br/>${fmt(p.value)}`
      },
      grid: { top: 8, left: 16, right: 16, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: sorted.map((d: any) => d.name), axisLabel: { color: textColor, fontSize: 10, rotate: 20 }, axisLine: { lineStyle: { color: gridColor } } },
      yAxis: { type: 'value', axisLabel: { color: textColor, fontSize: 10, formatter: (v: number) => `€${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: gridColor } } },
      series: [{
        type: 'bar',
        data: sorted.map((d: any, i: number) => ({ value: d.value, itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [6, 6, 0, 0] } })),
        barMaxWidth: 60
      }]
    }
  }, [data, dark, textColor, gridColor])

  if (loading) return (
    <div className="flex h-full items-center justify-center text-slate-400 dark:text-[#555]">
      <div className="flex flex-col items-center gap-3">
        <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span className="text-sm">Loading portfolio data…</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex h-full items-center justify-center">
      <p className="text-red-400">{error}</p>
    </div>
  )

  if (!data) return null

  const metrics = data.metrics || {}
  const latestVal = data.contributionGrowth?.length > 0
    ? data.contributionGrowth[data.contributionGrowth.length - 1]
    : null

  const totalAssets = (data.treemapData || []).reduce((s: number, g: any) => s + g.value, 0)
  const gain = latestVal ? latestVal.valuation - latestVal.contribution : 0
  const hasCorrelation = data.correlationMatrix && Object.keys(data.correlationMatrix).length > 1

  return (
    <div className="relative flex h-[calc(100vh-52px)] flex-col overflow-hidden bg-slate-100 dark:bg-[#0b0b0b]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-indigo-100/60 via-indigo-50/20 to-transparent dark:from-indigo-900/10 dark:to-transparent" />

      {/* Header */}
      <div className="relative z-20 flex-shrink-0 px-4 pb-2 pt-3">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-xl dark:border-[#252525] dark:bg-[#111111]/90">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[#f0f0f0]">Portfolio Analytics</h1>
            <p className="text-[11px] text-slate-500 dark:text-[#777]">Asset allocation, performance & correlation</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6">
        <div className="mx-auto w-full max-w-7xl space-y-4 pt-2">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Total Portfolio" value={fmt(totalAssets)} sub="Current valuation" />
            <KpiCard
              label="Unrealised Gain"
              value={fmt(gain)}
              sub={latestVal ? `on ${fmt(latestVal.contribution)} invested` : ''}
              color={gain >= 0 ? 'text-emerald-500' : 'text-red-500'}
            />
            <KpiCard
              label="Total Return"
              value={pct(metrics.totalReturn ?? 0)}
              sub="Since inception"
              color={(metrics.totalReturn ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}
            />
            <KpiCard
              label="CAGR"
              value={pct(metrics.cagr ?? 0)}
              sub="Compound annual growth"
              color={(metrics.cagr ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}
            />
          </div>

          {/* Row 1: Treemap + Bar */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Treemap */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] shadow-sm p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#666]">Asset Allocation — Treemap</p>
              {data.treemapData?.length > 0
                ? <ReactECharts option={treemapOption} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
                : <div className="flex h-[280px] items-center justify-center text-sm text-slate-400 dark:text-[#555]">No asset data</div>
              }
            </div>

            {/* Bar */}
            <div className="rounded-2xl border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] shadow-sm p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#666]">Group Values</p>
              {data.treemapData?.length > 0
                ? <ReactECharts option={barOption} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
                : <div className="flex h-[280px] items-center justify-center text-sm text-slate-400 dark:text-[#555]">No data</div>
              }
            </div>
          </div>

          {/* Row 2: Line chart + Correlation */}
          <div className={`grid grid-cols-1 gap-4 ${hasCorrelation ? 'lg:grid-cols-3' : ''}`}>
            {/* Contribution vs Valuation */}
            <div className={`${hasCorrelation ? 'lg:col-span-2' : ''} rounded-2xl border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] shadow-sm p-4`}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#666]">Contribution vs Market Valuation</p>
              {data.contributionGrowth?.length > 0
                ? <ReactECharts option={lineOption} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
                : <div className="flex h-[260px] items-center justify-center text-sm text-slate-400 dark:text-[#555]">
                    No transaction data linked to assets yet.<br/>Link transactions to assets to see performance over time.
                  </div>
              }
            </div>

            {/* Correlation Heatmap */}
            {hasCorrelation && (
              <div className="rounded-2xl border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] shadow-sm p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#666]">MoM Correlation Matrix</p>
                <ReactECharts option={correlationOption} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
              </div>
            )}
          </div>

          {/* Asset group breakdown table */}
          {data.treemapData?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#1f1f1f] bg-white dark:bg-[#111111] shadow-sm p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#666]">Group Breakdown</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#1f1f1f]">
                      <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-[#666]">Group</th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 dark:text-[#666]">Value</th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 dark:text-[#666]">Allocation</th>
                      <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-[#666] pl-4">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.treemapData].sort((a: any, b: any) => b.value - a.value).map((g: any, i: number) => {
                      const alloc = totalAssets > 0 ? (g.value / totalAssets) * 100 : 0
                      return (
                        <tr key={g.name} className="border-b border-slate-50 dark:border-[#1a1a1a] last:border-0">
                          <td className="py-2.5 flex items-center gap-2 font-medium text-slate-900 dark:text-[#f0f0f0]">
                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                            {g.name}
                          </td>
                          <td className="py-2.5 text-right font-mono text-slate-700 dark:text-[#d0d0d0]">{fmt(g.value)}</td>
                          <td className="py-2.5 text-right text-slate-500 dark:text-[#888]">{alloc.toFixed(1)}%</td>
                          <td className="py-2.5 pl-4">
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#1f1f1f] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${alloc}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}