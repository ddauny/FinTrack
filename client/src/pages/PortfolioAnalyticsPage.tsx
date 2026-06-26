import React, { useEffect, useState, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '../lib/api'
import { PrivacyNumber } from '../components/PrivacyNumber'
import { usePrivacy } from '../contexts/PrivacyContext'
import { useThemeContext } from '../contexts/ThemeContext'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n)

export function PortfolioAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const { hideNumbers } = usePrivacy()
  const { resolved } = useThemeContext()
  const isDark = resolved === 'dark'

  const growthChartRef = useRef<any>(null)
  const treemapChartRef = useRef<any>(null)
  const correlationChartRef = useRef<any>(null)

  useEffect(() => {
    setLoading(true)
    api.reports.portfolioAnalytics(dateRange.start, dateRange.end)
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [dateRange])

  // ResizeObserver to force charts to adapt to grid column layout resizes
  useEffect(() => {
    const refs = [growthChartRef, treemapChartRef, correlationChartRef]
    const observers: ResizeObserver[] = []

    refs.forEach(ref => {
      if (ref.current) {
        try {
          const echartsInstance = ref.current.getEchartsInstance()
          const parent = echartsInstance.getDom().parentElement
          if (parent) {
            const resizeObserver = new ResizeObserver(() => {
              try {
                echartsInstance.resize()
              } catch (e) {
                // ignore
              }
            })
            resizeObserver.observe(parent)
            observers.push(resizeObserver)
          }
        } catch (e) {
          // ignore
        }
      }
    })

    return () => {
      observers.forEach(obs => obs.disconnect())
    }
  }, [data, loading])

  const treemapOption = useMemo(() => {
    if (!data?.treemapData) return {}
    return {
      tooltip: {
      transitionDuration: 0,
        confine: true,
        backgroundColor: isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.95)',
        borderWidth: 0,
        borderRadius: 8,
        textStyle: { color: isDark ? '#f1f5f9' : '#1a1a1a', fontFamily: 'Outfit, Inter, sans-serif' },
        formatter: (info: any) => {
          const value = info.value
          const treePathInfo = info.treePathInfo
          const treePath = []
          for (let i = 1; i < treePathInfo.length; i++) {
            treePath.push(treePathInfo[i].name)
          }
          return [
            '<div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid ' + (isDark ? '#334155' : '#eee') + '; padding-bottom: 4px;">' + treePath.join(' &gt; ') + '</div>',
            '<div style="color: #3b82f6; font-weight: 800;">' + (hideNumbers ? '••••••' : fmt(value)) + '</div>'
          ].join('')
        }
      },
      color: [
        '#6366f1', // Indigo
        '#8b5cf6', // Purple
        '#3b82f6', // Blue
        '#06b6d4', // Cyan
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ec4899'  // Pink
      ],
      series: [{
        name: 'Portfolio',
        type: 'treemap',
        visibleMin: 300,
        label: {
          show: true,
          formatter: (p: any) => {
            return `${p.name}\n${hideNumbers ? '•••' : fmt(p.value)}`;
          },
          fontWeight: 600,
          fontFamily: 'Outfit, Inter, sans-serif'
        },
        upperLabel: {
          show: true,
          height: 30,
          color: '#fff',
          fontWeight: 800,
          fontFamily: 'Outfit, Inter, sans-serif'
        },
        itemStyle: {
          borderColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)',
          borderWidth: 2,
          gapWidth: 2
        },
        levels: [
          { itemStyle: { borderGapWidth: 5, borderColor: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(0,0,0,0.05)' }, upperLabel: { show: false } },
          { itemStyle: { gapWidth: 2, borderColor: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.8)' }, upperLabel: { show: true } },
          { itemStyle: { gapWidth: 1 } }
        ],
        data: data.treemapData
      }]
    }
  }, [data, hideNumbers, isDark])

  const growthOption = useMemo(() => {
    if (!data?.contributionGrowth) return {}
    const months = data.contributionGrowth.map((d: any) => d.month)
    const contributions = data.contributionGrowth.map((d: any) => d.contribution)
    const valuations = data.contributionGrowth.map((d: any) => d.valuation)

    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(148,163,184,0.08)'
    const axisLabelColor = isDark ? '#94a3b8' : '#64748b'

    return {
      tooltip: {
      transitionDuration: 0,
        trigger: 'axis',
        confine: true,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderRadius: 12,
        padding: [14, 18],
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontFamily: 'Outfit, Inter, sans-serif' },
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowBlur: 10,
        formatter: (params: any[]) => {
          const month = params[0]?.axisValue || ''
          const contrib = params.find((p: any) => p.seriesName === 'Invested Capital')?.value ?? 0
          const value = params.find((p: any) => p.seriesName === 'Portfolio Value')?.value ?? 0
          const gain = value - contrib
          const gainPct = contrib > 0 ? ((gain / contrib) * 100).toFixed(1) : '0.0'
          const gainColor = gain >= 0 ? '#10b981' : '#ef4444'
          const fmtN = (n: number) => hideNumbers ? '•••' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
          return `
            <div style="min-width:180px">
              <div style="font-size:10px;font-weight:700;color:${isDark ? '#94a3b8' : '#64748b'};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">${month}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:${isDark ? '#cbd5e1' : '#334155'}">
                  <span style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;display:inline-block"></span>Invested Capital
                </span>
                <span style="font-weight:700;font-size:13px">${fmtN(contrib)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <span style="display:flex;align-items:center;gap:6px;font-size:12px;color:${isDark ? '#cbd5e1' : '#334155'}">
                  <span style="width:8px;height:8px;border-radius:50%;background:#6366f1;display:inline-block"></span>Portfolio Value
                </span>
                <span style="font-weight:700;font-size:13px">${fmtN(value)}</span>
              </div>
              <div style="border-top:1px solid ${isDark ? '#334155' : '#e2e8f0'};padding-top:8px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11px;color:${isDark ? '#64748b' : '#94a3b8'}">Unrealized P/L</span>
                <span style="font-weight:800;font-size:13px;color:${gainColor}">${gain >= 0 ? '+' : ''}${fmtN(gain)} (${gain >= 0 ? '+' : ''}${gainPct}%)</span>
              </div>
            </div>
          `
        }
      },
      legend: {
        data: [
          { name: 'Invested Capital', icon: 'circle' },
          { name: 'Portfolio Value', icon: 'circle' }
        ],
        top: 0,
        right: 10,
        textStyle: { color: axisLabelColor, fontSize: 11, fontWeight: '600', fontFamily: 'Outfit, Inter, sans-serif' },
        itemWidth: 8, itemHeight: 8,
        selectedMode: true
      },
      grid: { left: 10, right: 15, bottom: 20, top: 40, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: axisLabelColor,
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Outfit, Inter, sans-serif',
          formatter: (val: string) => {
            const [y, m] = val.split('-')
            const mName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]
            return m === '01' ? `${mName}\n${y}` : mName
          }
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: axisLabelColor,
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Outfit, Inter, sans-serif',
          formatter: (v: number) => hideNumbers ? '•••' : (v >= 1000 ? `€${(v/1000).toFixed(0)}k` : `€${v}`)
        },
        splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Invested Capital',
          type: 'line',
          smooth: 0.3,
          symbol: 'none',
          data: contributions,
          itemStyle: { color: '#8b5cf6' },
          lineStyle: { width: 2, color: '#8b5cf6', type: 'dashed', opacity: 0.8 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(139,92,246,0.05)' }, { offset: 1, color: 'rgba(139,92,246,0)' }] } },
          z: 1
        },
        {
          name: 'Portfolio Value',
          type: 'line',
          smooth: 0.3,
          symbol: 'none',
          data: valuations,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 3, color: '#6366f1' },
          areaStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.25)' }, { offset: 0.7, color: 'rgba(99,102,241,0.04)' }, { offset: 1, color: 'rgba(99,102,241,0)' }] }
          },
          z: 2
        }
      ]
    }
  }, [data, hideNumbers, isDark])

  const correlationOption = useMemo(() => {
    if (!data?.correlationMatrix) return {}
    const groups = Object.keys(data.correlationMatrix)
    const matrixData: any[] = []
    groups.forEach((g1, i) => {
      groups.forEach((g2, j) => {
        matrixData.push([i, j, parseFloat(data.correlationMatrix[g1][g2].toFixed(2))])
      })
    })

    const axisLabelColor = isDark ? '#94a3b8' : '#64748b'

    return {
      tooltip: {
      transitionDuration: 0,
        position: 'top',
        confine: true,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderRadius: 8,
        textStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontFamily: 'Outfit, Inter, sans-serif' },
        formatter: (p: any) => {
          const g1 = groups[p.data[0]]
          const g2 = groups[p.data[1]]
          const val = p.data[2]
          return `<div style="font-weight:600">${g1} &harr; ${g2}</div><div style="font-weight:800;color:#3b82f6;margin-top:4px">${val}</div>`
        }
      },
      grid: { left: '12%', right: '8%', bottom: '20%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: groups,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { interval: 0, rotate: 30, color: axisLabelColor, fontSize: 10, fontWeight: '600', fontFamily: 'Outfit, Inter, sans-serif' }
      },
      yAxis: {
        type: 'category',
        data: groups,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: axisLabelColor, fontSize: 10, fontWeight: '600', fontFamily: 'Outfit, Inter, sans-serif' }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: isDark 
            ? ['#ef4444', '#1e293b', '#10b981'] // Dark mode: Red -> Dark Slate -> Green
            : ['#ef4444', '#f8fafc', '#10b981'] // Light mode: Red -> Off-white -> Green
        },
        textStyle: { color: axisLabelColor, fontSize: 9, fontWeight: '600', fontFamily: 'Outfit, Inter, sans-serif' }
      },
      series: [{
        name: 'Correlation',
        type: 'heatmap',
        data: matrixData,
        label: {
          show: true,
          color: (p: any) => {
            const val = p.data[2];
            if (isDark) return '#ffffff';
            return Math.abs(val) < 0.3 ? '#0f172a' : '#ffffff';
          },
          fontWeight: 'bold',
          fontFamily: 'Outfit, Inter, sans-serif',
          formatter: (p: any) => p.data[2]
        },
        itemStyle: {
          borderColor: isDark ? '#111111' : '#ffffff',
          borderWidth: 2
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.15)' }
        }
      }]
    }
  }, [data, isDark])

  const portfolioBreakdown = useMemo(() => {
    if (!data?.treemapData) return []
    const totalValuation = data.metrics?.finalValuation || 1
    
    return data.treemapData.map((group: any) => {
      const groupPct = (group.value / totalValuation) * 100
      
      const items = (group.children || []).map((item: any) => {
        const itemPct = (item.value / totalValuation) * 100
        
        const subItems = (item.children || []).map((sub: any) => {
          const subPct = (sub.value / totalValuation) * 100
          return {
            name: sub.name,
            value: sub.value,
            percentage: subPct
          }
        }).sort((a: any, b: any) => b.value - a.value)
        
        return {
          name: item.name,
          value: item.value,
          percentage: itemPct,
          subItems
        }
      }).sort((a: any, b: any) => b.value - a.value)
      
      return {
        name: group.name,
        value: group.value,
        percentage: groupPct,
        items
      }
    }).sort((a: any, b: any) => b.value - a.value)
  }, [data])

  const growthStats = useMemo(() => {
    if (!data?.contributionGrowth || data.contributionGrowth.length === 0) return null
    const last = data.contributionGrowth[data.contributionGrowth.length - 1]
    
    const endVal = data.metrics?.finalValuation || last.valuation || 0
    const totalInvested = data.metrics?.finalContribution || last.contribution || 0
    const netGain = endVal - totalInvested
    const roi = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0
    
    return {
      endVal,
      totalInvested,
      netGain,
      roi
    }
  }, [data])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">Analyzing financial records...</p>
      </div>
    )
  }

  const profit = (data?.metrics?.finalValuation || 0) - (data?.metrics?.finalContribution || 0);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 max-w-[1400px] mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
             </div>
             <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Portfolio IQ</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl">Deep exploration of your wealth dynamics and asset performance.</p>
        </div>
        <div className="flex bg-white dark:bg-[#111111] p-1.5 rounded-2xl border border-slate-200/80 dark:border-[#202020] shadow-sm hover:border-slate-300 dark:hover:border-[#2a2a2a] transition-colors">
          <input
            type="date"
            className="bg-transparent border-none px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <div className="w-px h-5 bg-slate-200 dark:bg-[#282828] self-center"></div>
          <input
            type="date"
            className="bg-transparent border-none px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      {/* Advanced Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 min-w-0 bg-white dark:bg-[#111] p-8 rounded-[2.5rem] border border-slate-200 dark:border-[#1f1f1f] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="w-full">
              <div className="flex justify-between items-start mb-8">
                  <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Growth Dynamics</h3>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Capital vs Value Evolution</p>
                  </div>
                  <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Return</span>
                          <span className={`text-xl font-extrabold ${data?.metrics?.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{data?.metrics?.totalReturn?.toFixed(2)}%</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200 dark:bg-[#202020]" />
                      <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">CAGR</span>
                          <span className="text-xl font-extrabold text-indigo-500">{data?.metrics?.cagr?.toFixed(2)}%</span>
                      </div>
                  </div>
              </div>
            </div>
            <div className="h-[400px] w-full min-w-0 overflow-hidden mt-2">
                <ReactECharts ref={growthChartRef} option={growthOption} style={{ height: '100%', width: '100%' }} />
            </div>
            
            {/* Growth Stats Footer */}
            {growthStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-[#1e1e1e]">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Invested Capital</span>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">{hideNumbers ? '••••' : fmt(growthStats.totalInvested)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Portfolio Value</span>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">{hideNumbers ? '••••' : fmt(growthStats.endVal)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unrealized Gain</span>
                  <p className={`text-base font-extrabold ${growthStats.netGain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {hideNumbers ? '••••' : `${growthStats.netGain >= 0 ? '+' : ''}${fmt(growthStats.netGain)}`}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Net ROI</span>
                  <p className={`text-base font-extrabold ${growthStats.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {growthStats.roi >= 0 ? '+' : ''}{growthStats.roi.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
        </div>

        <div className="space-y-6 flex flex-col justify-between">
            {/* Profit/Loss Breakdown Card */}
            <div className={`p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl ${
              profit >= 0 
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 shadow-emerald-500/10' 
                : 'bg-gradient-to-br from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700 shadow-rose-500/10'
            } text-white`}>
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">Unrealized P/L</h4>
                <div className="mt-4 flex flex-col">
                    <span className="text-4xl font-black tracking-tight">
                        <PrivacyNumber value={profit}>{fmt(profit)}</PrivacyNumber>
                    </span>
                    <span className="text-[10px] font-semibold uppercase mt-1.5 opacity-80">Market Gain since first deposit</span>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="opacity-80">Capital Contribution</span>
                        <span>{((data?.metrics?.finalContribution / data?.metrics?.finalValuation) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-black/15 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${(data?.metrics?.finalContribution / data?.metrics?.finalValuation) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Concentration Risk Card */}
            <div className="bg-white dark:bg-[#111] p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-[#1f1f1f] shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Asset Allocation</h4>
                <div className="mt-6 space-y-5">
                    {data?.concentrationRisk?.slice(0, 3).map((r: any, i: number) => (
                        <div key={i} className="space-y-2 group">
                            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span className="group-hover:text-indigo-500 transition-colors">{r.name}</span>
                                <span>{r.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-[#1c1c1c] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${
                                  i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-violet-400' : 'bg-slate-300 dark:bg-slate-700'
                                }`} style={{ width: `${r.percentage}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Saving Rate Insight */}
            <div className="bg-white dark:bg-[#111] p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-[#1f1f1f] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Savings Rate (12m)</h4>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{data?.metrics?.savingRate?.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="mt-5 flex gap-1.5">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className={`h-2 flex-1 rounded-full transition-all ${
                          i < (data?.metrics?.savingRate / 10) 
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-[#1c1c1c]'
                        }`}></div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Secondary Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="min-w-0 bg-white dark:bg-[#111] p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-[#1f1f1f] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">Allocation Treemap</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hierarchical view of asset distribution across all groups.</p>
            </div>
          </div>
          <div className="h-[380px] w-full min-w-0 overflow-hidden">
            <ReactECharts ref={treemapChartRef} option={treemapOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="min-w-0 bg-white dark:bg-[#111] p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-[#1f1f1f] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">Inter-Asset Correlation</h3>
              <div className="relative group/info">
                <button className="text-slate-400 dark:text-slate-500 hover:text-indigo-500 transition-colors p-1" aria-label="Correlation Information">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-80 p-4 bg-slate-900 dark:bg-slate-950 text-slate-200 text-xs rounded-xl shadow-xl opacity-0 scale-95 pointer-events-none group-hover/info:opacity-100 group-hover/info:scale-100 group-hover/info:pointer-events-auto transition-all duration-200 z-50 border border-slate-800">
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-slate-950"></div>
                  <h5 className="font-bold mb-2 text-white text-sm">Understanding Correlation</h5>
                  <p className="leading-relaxed mb-2 text-slate-300">
                    Measures how your different asset groups move in relation to one another on a month-to-month basis. Values range from -1.0 to +1.0:
                  </p>
                  <ul className="space-y-1.5 text-slate-300">
                    <li><strong className="text-emerald-400">+1.0 (Green):</strong> Positive correlation. Assets move together in the same direction. High values mean less diversification.</li>
                    <li><strong className="text-slate-400">0.0 (Gray):</strong> No correlation. Assets move independently, providing healthy diversification.</li>
                    <li><strong className="text-rose-400">-1.0 (Red):</strong> Negative correlation. Assets move in opposite directions, offering excellent hedging and risk protection.</li>
                  </ul>
                  <p className="mt-3 text-[10px] text-slate-400 font-semibold border-t border-slate-800 pt-2">
                    Aim for low or negative correlation values to reduce overall portfolio volatility.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Statistical relation between group movements.</p>
          </div>
          <div className="h-[380px] w-full min-w-0 overflow-hidden">
            <ReactECharts ref={correlationChartRef} option={correlationOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Portfolio Composition Section */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Portfolio Composition</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Detailed allocation breakdown of groups, accounts, and underlying assets.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {portfolioBreakdown.map((group: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-[#111] p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-[#1f1f1f] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-[#282828] transition-all flex flex-col justify-between">
              <div>
                {/* Group Header */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/20"></span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{group.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">{hideNumbers ? '••••••' : fmt(group.value)}</div>
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{group.percentage.toFixed(1)}% of portfolio</div>
                  </div>
                </div>

                {/* Group Assets List */}
                <div className="space-y-5">
                  {group.items.map((item: any, i: number) => (
                    <div key={i} className="border-t border-slate-100 dark:border-[#1e1e1e] pt-4 first:border-t-0 first:pt-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">{item.percentage.toFixed(1)}% of total</span>
                        </div>
                        <span className="text-sm font-bold text-slate-950 dark:text-white">{hideNumbers ? '•••' : fmt(item.value)}</span>
                      </div>
                      
                      {/* Relative weight inside the group */}
                      <div className="h-1.5 bg-slate-50 dark:bg-[#18181b] rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(item.value / (group.value || 1)) * 100}%` }}></div>
                      </div>

                      {/* Nested Sub-items (if any) */}
                      {item.subItems.length > 0 && (
                        <div className="pl-4 border-l-2 border-slate-100 dark:border-[#1e1e1e] space-y-2 mt-2.5">
                          {item.subItems.map((sub: any, j: number) => (
                            <div key={j} className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                              <span>{sub.name}</span>
                              <span>{hideNumbers ? '•••' : fmt(sub.value)} ({((sub.value / (item.value || 1)) * 100).toFixed(0)}%)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
