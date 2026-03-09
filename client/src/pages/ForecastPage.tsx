import { useEffect, useState, useReducer } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '../lib/api'
import { formatEUR } from '../lib/format'
import { PrivacyNumber } from '@/components/PrivacyNumber'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useChartTheme } from '@/hooks/useChartTheme'
import { useThemeContext } from '@/contexts/ThemeContext'

type Tab = 'forecast' | 'yoy' | 'goals' | 'monthly'

interface SavingsGoal {
    id: number
    name: string
    targetAmount: number
    currentAmount: number
    deadline: string | null
    icon: string | null
    color: string | null
}

export function ForecastPage() {
    const { hideNumbers } = usePrivacy()
    const { resolved } = useThemeContext()
    const dark = resolved === 'dark'
    const [tab, setTab] = useState<Tab>('forecast')
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', h)
        return () => window.removeEventListener('resize', h)
    }, [])

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'forecast', label: 'Net Worth Forecast', icon: '📈' },
        { key: 'yoy', label: 'Year over Year', icon: '📉' },
        { key: 'goals', label: 'Savings Goals', icon: '🎯' },
        { key: 'monthly', label: 'Monthly Forecast', icon: '📆' },
    ]

    return (
        <div className="h-full overflow-y-auto hide-scrollbar">
            <div className="p-3 space-y-3 flex flex-col max-w-7xl mx-auto">
                {/* Tab selector */}
                <div className="flex gap-1 bg-white dark:bg-stone-800 p-1 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-x-auto hide-scrollbar shrink-0">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === t.key
                                ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                                : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-700/50'
                                }`}
                        >
                            <span>{t.icon}</span>
                            {!isMobile && <span>{t.label}</span>}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 min-h-0">
                    {tab === 'forecast' && <NetWorthForecastTab dark={dark} hideNumbers={hideNumbers} isMobile={isMobile} />}
                    {tab === 'yoy' && <YearOverYearTab dark={dark} hideNumbers={hideNumbers} isMobile={isMobile} />}
                    {tab === 'goals' && <SavingsGoalsTab dark={dark} hideNumbers={hideNumbers} />}
                    {tab === 'monthly' && <MonthlyForecastTab dark={dark} hideNumbers={hideNumbers} />}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Tab 1: Net Worth Forecast
// ═══════════════════════════════════════════════════════════
function NetWorthForecastTab({ dark, hideNumbers, isMobile }: { dark: boolean; hideNumbers: boolean; isMobile: boolean }) {
    const ct = useChartTheme()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.forecast.netWorth().then(setData).catch(console.error).finally(() => setLoading(false))
    }, [])

    if (loading) return <LoadingSpinner />
    if (!data || !data.history?.length) return <EmptyState message="Not enough data to generate a forecast. Add asset valuations to get started." />

    const history = data.history || []
    const projection = data.projection || []

    const allDates = [...history.map((h: any) => h.date), ...projection.map((p: any) => p.date)]
    const labels = allDates.map((d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))

    const historyValues = history.map((h: any) => h.value)
    const projectionLine = new Array(history.length - 1).fill(null).concat([history[history.length - 1].value, ...projection.map((p: any) => p.value)])

    const option = {
        backgroundColor: ct.bg,
        grid: { left: '5%', right: '5%', bottom: '12%', top: '15%', containLabel: true },
        legend: {
            data: ['Historical', 'Projected'],
            top: 5,
            textStyle: { color: ct.tooltipText, fontSize: 11 },
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: ct.tooltipBg,
            borderColor: ct.tooltipBorder,
            textStyle: { color: ct.tooltipText },
            formatter: (params: any) => {
                const lines = params.map((p: any) => {
                    if (p.value == null) return ''
                    const val = hideNumbers ? '••••••' : formatEUR(p.value)
                    return `${p.marker} ${p.seriesName}: ${val}`
                }).filter(Boolean)
                return `${params[0].name}<br/>${lines.join('<br/>')}`
            },
            confine: true,
        },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { color: ct.axisLabel, fontSize: 10, rotate: isMobile ? 45 : 0 },
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: {
                formatter: (v: number) => hideNumbers ? '••••' : v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`,
                color: ct.axisLabel,
                fontSize: 10,
            },
            splitLine: { lineStyle: { color: ct.splitLine } },
        },
        series: [
            {
                name: 'Historical',
                type: 'line',
                data: historyValues.concat(new Array(projection.length).fill(null)),
                lineStyle: { color: '#3b82f6', width: 2 },
                itemStyle: { color: '#3b82f6' },
                symbolSize: 6,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: dark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.15)' },
                            { offset: 1, color: 'rgba(59,130,246,0)' },
                        ],
                    },
                },
            },
            {
                name: 'Projected',
                type: 'line',
                data: projectionLine,
                lineStyle: { color: '#8b5cf6', width: 2, type: 'dashed' },
                itemStyle: { color: '#8b5cf6' },
                symbolSize: 6,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: dark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)' },
                            { offset: 1, color: 'rgba(139,92,246,0)' },
                        ],
                    },
                },
            },
        ],
    }

    // Summary cards
    const currentNW = history[history.length - 1]?.value || 0
    const projected3m = projection[2]?.value || 0
    const projected6m = projection[5]?.value || 0

    return (
        <div className="space-y-3 h-full flex flex-col">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                <SummaryCard label="Current Net Worth" value={currentNW} color="blue" dark={dark} hideNumbers={hideNumbers} />
                <SummaryCard label="Projected (3 months)" value={projected3m} color="violet" dark={dark} hideNumbers={hideNumbers} />
                <SummaryCard label="Projected (6 months)" value={projected6m} color="purple" dark={dark} hideNumbers={hideNumbers} />
            </div>
            {/* Chart */}
            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 flex-1 min-h-0">
                <ReactECharts option={option} style={{ height: '100%', minHeight: '300px' }} />
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Tab 2: Year over Year
// ═══════════════════════════════════════════════════════════
function YearOverYearTab({ dark, hideNumbers, isMobile }: { dark: boolean; hideNumbers: boolean; isMobile: boolean }) {
    const ct = useChartTheme()
    const currentYear = new Date().getFullYear()
    const [year1, setYear1] = useState(currentYear - 1)
    const [year2, setYear2] = useState(currentYear)
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        api.forecast.yearOverYear(year1, year2).then(setData).catch(console.error).finally(() => setLoading(false))
    }, [year1, year2])

    if (loading) return <LoadingSpinner />

    const months = data?.months || []
    const y1Inc = data?.year1Income || []
    const y1Exp = data?.year1Expense || []
    const y2Inc = data?.year2Income || []
    const y2Exp = data?.year2Expense || []

    const totalY1Inc = y1Inc.reduce((a: number, b: number) => a + b, 0)
    const totalY1Exp = y1Exp.reduce((a: number, b: number) => a + b, 0)
    const totalY2Inc = y2Inc.reduce((a: number, b: number) => a + b, 0)
    const totalY2Exp = y2Exp.reduce((a: number, b: number) => a + b, 0)

    const barOption = {
        backgroundColor: ct.bg,
        grid: { left: '3%', right: '4%', top: '15%', bottom: '10%', containLabel: true },
        legend: {
            data: [`${year1} Income`, `${year1} Expenses`, `${year2} Income`, `${year2} Expenses`],
            top: 5,
            textStyle: { color: ct.tooltipText, fontSize: 10 },
            type: 'scroll',
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: ct.tooltipBg,
            borderColor: ct.tooltipBorder,
            textStyle: { color: ct.tooltipText },
            formatter: (params: any) => {
                const lines = params.map((p: any) => {
                    const val = hideNumbers ? '••••••' : formatEUR(p.value)
                    return `${p.marker} ${p.seriesName}: ${val}`
                })
                return `${params[0].name}<br/>${lines.join('<br/>')}`
            },
            confine: true,
        },
        xAxis: {
            type: 'category',
            data: months,
            axisLabel: { color: ct.axisLabel, fontSize: 10 },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (v: number) => hideNumbers ? '••••' : v >= 1000 ? `€${(v / 1000).toFixed(0)}k` : `€${v}`,
                color: ct.axisLabel,
                fontSize: 10,
            },
            splitLine: { lineStyle: { color: ct.splitLine } },
        },
        series: [
            { name: `${year1} Income`, type: 'bar', data: y1Inc, itemStyle: { color: '#6ee7b7' }, barGap: '10%' },
            { name: `${year1} Expenses`, type: 'bar', data: y1Exp, itemStyle: { color: '#fca5a5' } },
            { name: `${year2} Income`, type: 'bar', data: y2Inc, itemStyle: { color: '#10b981' } },
            { name: `${year2} Expenses`, type: 'bar', data: y2Exp, itemStyle: { color: '#ef4444' } },
        ],
    }

    const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

    return (
        <div className="space-y-3 h-full flex flex-col">
            {/* Year selectors */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-stone-800 p-3 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 shrink-0">
                <div className="flex items-center gap-2">
                    <label htmlFor="year1" className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Year 1</label>
                    <select id="year1" value={year1} onChange={e => setYear1(Number(e.target.value))}
                        className="px-2 py-1 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <span className="text-stone-400 dark:text-stone-500 font-bold">vs</span>
                <div className="flex items-center gap-2">
                    <label htmlFor="year2" className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Year 2</label>
                    <select id="year2" value={year2} onChange={e => setYear2(Number(e.target.value))}
                        className="px-2 py-1 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary comparison cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <MiniCard label={`${year1} Income`} value={totalY1Inc} color="emerald" dark={dark} hideNumbers={hideNumbers} />
                <MiniCard label={`${year1} Expenses`} value={totalY1Exp} color="rose" dark={dark} hideNumbers={hideNumbers} />
                <MiniCard label={`${year2} Income`} value={totalY2Inc} color="emerald" dark={dark} hideNumbers={hideNumbers} />
                <MiniCard label={`${year2} Expenses`} value={totalY2Exp} color="rose" dark={dark} hideNumbers={hideNumbers} />
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 flex-1 min-h-0">
                <ReactECharts option={barOption} style={{ height: '100%', minHeight: '300px' }} />
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Tab 3: Savings Goals
// ═══════════════════════════════════════════════════════════
function SavingsGoalsTab({ dark, hideNumbers }: { dark: boolean; hideNumbers: boolean }) {
    const [goals, setGoals] = useState<SavingsGoal[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<SavingsGoal | null>(null)

    const loadGoals = () => {
        setLoading(true)
        api.savingsGoals.list().then((data: any) => setGoals(data)).catch(console.error).finally(() => setLoading(false))
    }
    useEffect(loadGoals, [])

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this savings goal?')) return
        await api.savingsGoals.remove(id)
        loadGoals()
    }

    if (loading) return <LoadingSpinner />

    const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']

    return (
        <div className="space-y-3">
            {/* Add button */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">🎯 Savings Goals</h3>
                <button
                    onClick={() => { setEditing(null); setShowModal(true) }}
                    className="btn-primary !px-3 !py-1.5 text-sm flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Goal
                </button>
            </div>

            {goals.length === 0 ? (
                <EmptyState message="No savings goals yet. Create one to start tracking your financial objectives!" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {goals.map((goal, i) => {
                        const pct = Number(goal.targetAmount) > 0
                            ? Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100))
                            : 0
                        const color = goal.color || defaultColors[i % defaultColors.length]
                        const daysLeft = goal.deadline
                            ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000))
                            : null
                        const remaining = Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount))

                        return (
                            <div key={goal.id}
                                className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{goal.icon || '💰'}</span>
                                        <h4 className="font-bold text-stone-900 dark:text-white text-sm">{goal.name}</h4>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditing(goal); setShowModal(true) }}
                                            className="p-1 rounded-lg text-stone-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleDelete(goal.id)}
                                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-semibold" style={{ color }}>
                                            <PrivacyNumber value={Number(goal.currentAmount)}>{formatEUR(Number(goal.currentAmount))}</PrivacyNumber>
                                        </span>
                                        <span className="text-stone-500 dark:text-stone-400">
                                            <PrivacyNumber value={Number(goal.targetAmount)}>{formatEUR(Number(goal.targetAmount))}</PrivacyNumber>
                                        </span>
                                    </div>
                                    <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2.5">
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, backgroundColor: color }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                                        <span className="text-xs text-stone-500 dark:text-stone-400">
                                            <PrivacyNumber value={remaining}>
                                                {formatEUR(remaining)} remaining
                                            </PrivacyNumber>
                                        </span>
                                    </div>
                                </div>

                                {/* Deadline */}
                                {daysLeft !== null && (
                                    <div className={`text-xs mt-2 px-2 py-1 rounded-lg text-center font-medium ${daysLeft <= 30 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                        : daysLeft <= 90 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                            : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                                        }`}>
                                        {daysLeft === 0 ? '⏰ Deadline today!' : `📅 ${daysLeft} days left`}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <GoalModal
                    dark={dark}
                    goal={editing}
                    onClose={() => { setShowModal(false); setEditing(null) }}
                    onSave={loadGoals}
                />
            )}
        </div>
    )
}

function GoalModal({ dark, goal, onClose, onSave }: { dark: boolean; goal: SavingsGoal | null; onClose: () => void; onSave: () => void }) {
    const [state, dispatch] = useReducer((state: any, action: any) => {
        return { ...state, [action.type]: action.payload }
    }, {
        name: goal?.name || '',
        target: goal ? String(Number(goal.targetAmount)) : '',
        current: goal ? String(Number(goal.currentAmount)) : '0',
        deadline: goal?.deadline ? goal.deadline.split('T')[0] : '',
        icon: goal?.icon || '💰',
        color: goal?.color || '#3b82f6',
        saving: false
    })

    const { name, target, current, deadline, icon, color, saving } = state

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        dispatch({ type: 'saving', payload: true })
        try {
            const data = {
                name,
                targetAmount: Number(target),
                currentAmount: Number(current),
                deadline: deadline || null,
                icon,
                color,
            }
            if (goal) {
                await api.savingsGoals.update(goal.id, data)
            } else {
                await api.savingsGoals.create(data)
            }
            onSave()
            onClose()
        } catch (err) {
            console.error(err)
        } finally {
            dispatch({ type: 'saving', payload: false })
        }
    }

    const emojiOptions = ['💰', '🏠', '🚗', '✈️', '🎓', '💍', '📱', '🏖️', '🎯', '🛡️', '🏋️', '🎮']
    const colorOptions = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose() }} role="button" tabIndex={0}>
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 border border-stone-200 dark:border-stone-700" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h3 id="modal-title" className="text-lg font-bold text-stone-900 dark:text-white">{goal ? 'Edit Goal' : 'New Savings Goal'}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label htmlFor="goal-name" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Name</label>
                        <input id="goal-name" value={name} onChange={e => dispatch({ type: 'name', payload: e.target.value })} required
                            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white" placeholder="e.g. Vacation Fund" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="goal-target" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Target (€)</label>
                            <input id="goal-target" type="number" value={target} onChange={e => dispatch({ type: 'target', payload: e.target.value })} required min="1" step="0.01"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white" />
                        </div>
                        <div>
                            <label htmlFor="goal-current" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Current (€)</label>
                            <input id="goal-current" type="number" value={current} onChange={e => dispatch({ type: 'current', payload: e.target.value })} min="0" step="0.01"
                                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="goal-deadline" className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Deadline (optional)</label>
                        <input id="goal-deadline" type="date" value={deadline} onChange={e => dispatch({ type: 'deadline', payload: e.target.value })}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white" />
                    </div>
                    <div>
                        <div className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Icon</div>
                        <div className="flex flex-wrap gap-2">
                            {emojiOptions.map(e => (
                                <button key={e} type="button" onClick={() => dispatch({ type: 'icon', payload: e })}
                                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${icon === e ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-500' : 'hover:bg-stone-100 dark:hover:bg-stone-700'
                                        }`}>{e}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Color</div>
                        <div className="flex gap-2">
                            {colorOptions.map(c => (
                                <button key={c} type="button" onClick={() => dispatch({ type: 'color', payload: c })}
                                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-stone-400 dark:ring-offset-stone-800' : ''}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="btn-secondary flex-1 !px-3 !py-2 text-sm">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="btn-primary flex-1 !px-3 !py-2 text-sm disabled:opacity-50">
                            {saving ? 'Saving...' : goal ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Tab 4: Monthly Forecast
// ═══════════════════════════════════════════════════════════
function MonthlyForecastTab({ dark, hideNumbers }: { dark: boolean; hideNumbers: boolean }) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const ct = useChartTheme()

    useEffect(() => {
        api.forecast.monthlyForecast().then(setData).catch(console.error).finally(() => setLoading(false))
    }, [])

    if (loading) return <LoadingSpinner />
    if (!data) return <EmptyState message="Unable to load monthly forecast data." />

    const monthProgress = Math.round((data.daysPassed / data.daysInMonth) * 100)
    const totalIncome = data.actualIncome + data.projectedIncome
    const totalExpenses = data.actualExpenses + data.projectedExpenses

    // Previous month comparison helpers
    const incomeChange = data.prevMonthIncome > 0
        ? Math.round(((totalIncome - data.prevMonthIncome) / data.prevMonthIncome) * 100) : null
    const expenseChange = data.prevMonthExpenses > 0
        ? Math.round(((totalExpenses - data.prevMonthExpenses) / data.prevMonthExpenses) * 100) : null

    // Cumulative chart options
    const cumulativeChartOption = {
        tooltip: {
            trigger: 'axis' as const,
            backgroundColor: ct.tooltipBg,
            borderColor: ct.tooltipBorder,
            textStyle: { color: ct.tooltipText, fontSize: 12 },
            formatter: (params: any) => {
                if (hideNumbers) return `Day ${params[0]?.axisValue}`
                const lines = params.map((p: any) =>
                    `<span style="color:${p.color}">●</span> ${p.seriesName}: ${formatEUR(p.value)}`
                )
                return `<strong>Day ${params[0]?.axisValue}</strong><br/>${lines.join('<br/>')}`
            },
        },
        grid: { left: 12, right: 12, top: 16, bottom: 24, containLabel: true },
        xAxis: {
            type: 'category' as const,
            data: (data.dailyCumulative || []).map((d: any) => d.day),
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
                name: 'Expenses',
                type: 'line',
                data: (data.dailyCumulative || []).map((d: any) => d.expenses),
                smooth: true,
                lineStyle: { width: 2.5 },
                itemStyle: { color: '#f43f5e' },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(244,63,94,0.18)' }, { offset: 1, color: 'rgba(244,63,94,0.02)' }] } },
                symbol: 'none',
            },
            {
                name: 'Income',
                type: 'line',
                data: (data.dailyCumulative || []).map((d: any) => d.income),
                smooth: true,
                lineStyle: { width: 2.5 },
                itemStyle: { color: '#10b981' },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.18)' }, { offset: 1, color: 'rgba(16,185,129,0.02)' }] } },
                symbol: 'none',
            },
        ],
    }

    // Donut chart for expense categories
    const expenseDonutOption = data.topExpenses?.length > 0 ? {
        tooltip: {
            trigger: 'item' as const,
            backgroundColor: ct.tooltipBg,
            borderColor: ct.tooltipBorder,
            textStyle: { color: ct.tooltipText, fontSize: 12 },
            formatter: (p: any) => hideNumbers ? `${p.name}` : `${p.name}: ${formatEUR(p.value)} (${p.percent?.toFixed(1)}%)`,
        },
        series: [{
            type: 'pie',
            radius: ['50%', '78%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 6, borderColor: ct.bg, borderWidth: 2 },
            label: { show: false },
            data: data.topExpenses.map((c: any, i: number) => ({
                value: c.amount,
                name: c.name,
                itemStyle: { color: ['#f43f5e', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b'][i] || '#94a3b8' },
            })),
        }],
    } : null

    return (
        <div className="space-y-3">
            {/* Month header */}
            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white">📆 {data.monthLabel}</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
                        Day {data.daysPassed} of {data.daysInMonth}
                    </span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${monthProgress}%` }} />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{monthProgress}% of the month completed</p>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Actual Income" value={data.actualIncome} color="emerald" hideNumbers={hideNumbers} />
                <KpiCard label="Actual Expenses" value={data.actualExpenses} color="rose" hideNumbers={hideNumbers} />
                <KpiCard label="Avg Daily Spending" value={data.avgDailySpending} color="amber" hideNumbers={hideNumbers} />
                <KpiCard label="Savings Rate" value={data.savingsRate} color="blue" hideNumbers={hideNumbers} suffix="%" isSavings />
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
                        <ForecastRow label="Actual (recorded)" value={data.actualIncome} dark={dark} hideNumbers={hideNumbers} color="emerald" icon="✅" />
                        <ForecastRow label="Projected (recurring)" value={data.projectedIncome} dark={dark} hideNumbers={hideNumbers} color="emerald" icon="🔮" dashed />
                        <div className="border-t border-stone-200 dark:border-stone-700 pt-2">
                            <ForecastRow label="Total estimated" value={totalIncome} dark={dark} hideNumbers={hideNumbers} color="emerald" icon="📊" bold />
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
                        <ForecastRow label="Actual (recorded)" value={data.actualExpenses} dark={dark} hideNumbers={hideNumbers} color="rose" icon="✅" />
                        <ForecastRow label="Projected (recurring)" value={data.projectedExpenses} dark={dark} hideNumbers={hideNumbers} color="rose" icon="🔮" dashed />
                        <div className="border-t border-stone-200 dark:border-stone-700 pt-2">
                            <ForecastRow label="Total estimated" value={totalExpenses} dark={dark} hideNumbers={hideNumbers} color="rose" icon="📊" bold />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cumulative chart */}
            {(data.dailyCumulative?.length > 1) && (
                <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Cumulative Income vs Expenses</h4>
                    <ReactECharts option={cumulativeChartOption} style={{ height: 200 }} opts={{ renderer: 'svg' }} />
                </div>
            )}

            {/* Expense breakdown + Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Expense donut */}
                {expenseDonutOption && (
                    <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                        <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Top Expense Categories</h4>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <ReactECharts option={expenseDonutOption} style={{ height: 160 }} opts={{ renderer: 'svg' }} />
                            </div>
                            <div className="space-y-1.5 min-w-0 flex-shrink-0">
                                {data.topExpenses.slice(0, 5).map((c: any, i: number) => (
                                    <div key={c.name} className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ['#f43f5e', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#64748b'][i] || '#94a3b8' }} />
                                        <span className="text-[11px] text-stone-600 dark:text-stone-300 truncate max-w-[100px]">{c.name}</span>
                                        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-200 ml-auto">
                                            <PrivacyNumber value={c.amount}>{formatEUR(c.amount)}</PrivacyNumber>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Estimated Balance */}
                <div className={`bg-white dark:bg-stone-800 p-5 rounded-2xl shadow-sm border flex flex-col justify-center ${data.estimatedBalance >= 0
                    ? 'border-emerald-200 dark:border-emerald-900/40'
                    : 'border-rose-200 dark:border-rose-900/40'
                    }`}>
                    <div className="text-center">
                        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">Estimated Monthly Balance</p>
                        <div className={`text-3xl font-bold ${data.estimatedBalance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                            }`}>
                            <PrivacyNumber value={data.estimatedBalance}>
                                {data.estimatedBalance > 0 ? '+' : ''}{formatEUR(data.estimatedBalance)}
                            </PrivacyNumber>
                        </div>
                        {data.prevMonthBalance !== undefined && data.prevMonthBalance !== 0 && (
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">
                                Last month: <span className={`font-semibold ${data.prevMonthBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    <PrivacyNumber value={data.prevMonthBalance}>{data.prevMonthBalance > 0 ? '+' : ''}{formatEUR(data.prevMonthBalance)}</PrivacyNumber>
                                </span>
                            </p>
                        )}
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Based on recorded transactions + scheduled recurring items</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// KPI card for monthly forecast
function KpiCard({ label, value, color, hideNumbers, suffix, isSavings }: {
    label: string; value: number; color: string; hideNumbers: boolean; suffix?: string; isSavings?: boolean
}) {
    const colorMap: Record<string, string> = {
        emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40',
        rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40',
        amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40',
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40',
    }
    const display = isSavings
        ? `${value}%`
        : formatEUR(value)

    return (
        <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.blue}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-0.5">{label}</p>
            <p className="text-base font-bold">
                <PrivacyNumber value={value}>{display}</PrivacyNumber>
            </p>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Shared components
// ═══════════════════════════════════════════════════════════
function SummaryCard({ label, value, color, dark, hideNumbers }: { label: string; value: number; color: string; dark: boolean; hideNumbers: boolean }) {
    const colorClasses: Record<string, string> = {
        blue: 'border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300',
        violet: 'border-violet-100 dark:border-violet-900/40 text-violet-700 dark:text-violet-300',
        purple: 'border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300',
        emerald: 'border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300',
        rose: 'border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300',
    }

    return (
        <div className={`bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm border ${colorClasses[color] || colorClasses.blue}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
            <h3 className="text-xl font-bold tracking-tight">
                <PrivacyNumber value={value}>{formatEUR(value)}</PrivacyNumber>
            </h3>
        </div>
    )
}

function MiniCard({ label, value, color, dark, hideNumbers }: { label: string; value: number; color: string; dark: boolean; hideNumbers: boolean }) {
    return (
        <div className="bg-white dark:bg-stone-800 p-3 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
            <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-0.5">{label}</p>
            <div className={`text-sm font-bold ${color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <PrivacyNumber value={value}>{formatEUR(value)}</PrivacyNumber>
            </div>
        </div>
    )
}

function ForecastRow({ label, value, dark, hideNumbers, color, icon, dashed, bold }: {
    label: string; value: number; dark: boolean; hideNumbers: boolean; color: string; icon: string; dashed?: boolean; bold?: boolean
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} text-stone-700 dark:text-stone-200 ${dashed ? 'opacity-70' : ''}`}>{label}</span>
            </div>
            <div className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                } ${dashed ? 'opacity-70' : ''}`}>
                <PrivacyNumber value={value}>{formatEUR(value)}</PrivacyNumber>
            </div>
        </div>
    )
}

function LoadingSpinner() {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <div className="text-stone-600 dark:text-stone-300 text-sm">Loading data...</div>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="bg-white dark:bg-stone-800 p-12 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 text-center flex flex-col justify-center items-center">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-stone-500 dark:text-stone-400 text-sm">{message}</div>
        </div>
    )
}
