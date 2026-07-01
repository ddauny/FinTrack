import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import ReactECharts from 'echarts-for-react'
import { api } from '../lib/api'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { Transaction, Category } from '../types'

export function AiReportsPage() {
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<Transaction[]>([])
    const [filterApplied, setFilterApplied] = useState<any>(null)
    const [chatResult, setChatResult] = useState<{markdownText: string, widgets?: any[]} | null>(null)
    const [mode, setMode] = useState<'query' | 'chat'>('query')
    const [error, setError] = useState<string | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [initialLoading, setInitialLoading] = useState(true)

    useEffect(() => {
        api.categories.list().then(setCategories).catch(console.error).finally(() => setInitialLoading(false))
    }, [])

    const categoryMap = useMemo(() => {
        const map: Record<number, Category> = {}
        categories.forEach(c => { map[c.id] = c })
        return map
    }, [categories])

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!prompt.trim()) return

        setLoading(true)
        setError(null)
        setChatResult(null)
        try {
            if (mode === 'query') {
                const data = await api.transactions.aiQuery(prompt)
                setResults(data.items)
                setFilterApplied(data.filterApplied)
            } else {
                const data = await api.reports.aiChat(prompt)
                setChatResult(data)
            }
        } catch (err: any) {
            console.error('AI Query Error:', err)
            setError(err.message || 'Failed to fetch AI results')
        } finally {
            setLoading(false)
        }
    }

    const examples = mode === 'query' ? [
        "Expenses from last month",
        "All transactions related to Amazon",
        "How much did I spend on restaurants in May?",
        "Income over 1000 euros in 2024",
    ] : [
        "What is the trend of my Real Estate assets?",
        "Analyze my spending habits for the last 6 months",
        "How is my ETF portfolio performing?",
        "Am I saving enough compared to my income?"
    ]

    if (initialLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
                <div className="w-48 h-1 bg-slate-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-blue-600 w-1/3 animate-[shimmer_1.5s_infinite] rounded-full" style={{ animationTimingFunction: 'ease-in-out' }}></div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Syncing Intelligence</p>
                    <p className="text-[9px] font-medium text-slate-300 dark:text-slate-700">Loading AI reasoning core...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-8 max-w-[1400px] mx-auto pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom stagger-1">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                        <span className="text-blue-500">✨</span> AI Analysis
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                        {mode === 'query' ? 'Query your financial data using natural language processing.' : 'Chat with your AI financial advisor about your portfolio and trends.'}
                    </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-lg">
                    <button onClick={() => setMode('query')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${mode === 'query' ? 'bg-white dark:bg-[#2a2a2a] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Search Data</button>
                    <button onClick={() => setMode('chat')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${mode === 'chat' ? 'bg-white dark:bg-[#2a2a2a] text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Ask Advisor</button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-slate-200 dark:border-[#1a1a1a] p-5 shadow-sm animate-in fade-in slide-in-from-bottom stagger-2">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={mode === 'query' ? "Search for 'restaurant expenses in April'..." : "Ask 'What is the trend of my assets?'..."}
                        className="flex-1 bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#222] rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest py-2.5 px-8 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Execute'
                        )}
                    </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                    {examples.map((ex, i) => (
                        <button
                            key={i}
                            onClick={() => setPrompt(ex)}
                            className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-[#252525] hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded transition-all border border-transparent hover:border-slate-300 dark:hover:border-[#333]"
                        >
                            {ex}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-xs font-bold uppercase tracking-wide">
                    ⚠️ Error: {error}
                </div>
            )}

            {mode === 'chat' && chatResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom stagger-3">
                    <div className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-slate-200 dark:border-[#1a1a1a] p-6 shadow-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-500">
                            <ReactMarkdown>{chatResult.markdownText}</ReactMarkdown>
                        </div>
                    </div>

                    {chatResult.widgets && chatResult.widgets.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {chatResult.widgets.map((widget, idx) => (
                                <div key={idx} className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-slate-200 dark:border-[#1a1a1a] p-5 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-widest">{widget.title}</h3>
                                    
                                    {(widget.type === 'bar_chart' || widget.type === 'line_chart') && widget.data && (
                                        <ReactECharts 
                                            option={{
                                                tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,10,10,0.9)', textStyle: { color: '#fff' }, borderColor: '#222' },
                                                legend: widget.seriesConfig ? { data: widget.seriesConfig.map((sc:any)=>sc.name), textStyle: { color: '#888' }, bottom: 0 } : undefined,
                                                grid: { bottom: widget.seriesConfig ? 40 : 20 },
                                                xAxis: { type: 'category', data: widget.data.map((d: any) => d.label) },
                                                yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(100,100,100,0.1)' } } },
                                                series: widget.seriesConfig 
                                                    ? widget.seriesConfig.map((sc: any) => ({
                                                        name: sc.name,
                                                        type: widget.type === 'bar_chart' ? 'bar' : 'line',
                                                        smooth: widget.type === 'line_chart',
                                                        data: widget.data.map((d: any) => d[sc.key]),
                                                        itemStyle: { color: sc.color, borderRadius: widget.type === 'bar_chart' ? [4,4,0,0] : 0 },
                                                        areaStyle: widget.type === 'line_chart' ? { opacity: 0.1 } : undefined
                                                    }))
                                                    : [
                                                        { type: widget.type === 'bar_chart' ? 'bar' : 'line', smooth: true, data: widget.data.map((d: any) => d.value1), itemStyle: { borderRadius: [4,4,0,0], color: '#10b981' } }, // Default Green for value1 (usually Income)
                                                        ...(widget.data[0]?.value2 !== undefined ? [{ type: widget.type === 'bar_chart' ? 'bar' : 'line', smooth: true, data: widget.data.map((d: any) => d.value2), itemStyle: { borderRadius: [4,4,0,0], color: '#ef4444' } }] as any[] : []) // Default Red for value2 (usually Expense)
                                                    ]
                                            }} 
                                            style={{ height: '300px' }} 
                                        />
                                    )}

                                    {widget.type === 'pie_chart' && widget.data && (
                                        <ReactECharts 
                                            option={{
                                                tooltip: { trigger: 'item', backgroundColor: 'rgba(10,10,10,0.9)', textStyle: { color: '#fff' }, borderColor: '#222' },
                                                series: [
                                                    { type: 'pie', radius: ['40%', '70%'], data: widget.data, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 } }
                                                ]
                                            }} 
                                            style={{ height: '300px' }} 
                                        />
                                    )}

                                    {widget.type === 'table' && widget.columns && widget.rows && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                                                <thead className="bg-slate-50 dark:bg-[#141414] text-slate-900 dark:text-white uppercase text-[10px] tracking-wider font-bold">
                                                    <tr>
                                                        {widget.columns.map((c: string, i: number) => <th key={i} className="px-4 py-3 border-b border-slate-200 dark:border-[#222]">{c}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {widget.rows.map((row: string[], i: number) => (
                                                        <tr key={i} className="border-b border-slate-100 dark:border-[#1a1a1a] hover:bg-slate-50 dark:hover:bg-[#161616]">
                                                            {row.map((cell: string, j: number) => <td key={j} className="px-4 py-3">{cell}</td>)}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {mode === 'query' && results.length > 0 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom stagger-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                            Results ({results.length})
                        </h2>
                        {filterApplied && (
                            <div className="text-[9px] font-mono bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 dark:text-slate-600 p-2 rounded border border-slate-200 dark:border-[#222] max-w-md overflow-hidden text-ellipsis whitespace-nowrap" title={JSON.stringify(filterApplied)}>
                                Engine Filter: {JSON.stringify(filterApplied)}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-slate-200 dark:border-[#1a1a1a] overflow-hidden shadow-sm">
                        <TransactionTable 
                            items={results} 
                            sortBy="date"
                            order="desc"
                            toggleSort={() => {}}
                            selectionMode={false}
                            selectedIds={new Set()}
                            toggleSelectItem={() => {}}
                            categoryMap={categoryMap}
                            setEditingId={() => {}}
                            setForm={() => {}}
                            setCategoryQuery={() => {}}
                            setShowModal={() => {}}
                            setItems={() => {}}
                            setTotal={() => {}}
                        />
                    </div>
                </div>
            ) : mode === 'query' && prompt && !loading && !error && (
                <div className="bg-white dark:bg-[#0c0c0c] border border-dashed border-slate-200 dark:border-[#1a1a1a] rounded-xl p-16 text-center">
                    <div className="text-2xl mb-4 opacity-20 text-slate-400">🔍</div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                        No data streams matched your query
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-medium">
                        Try rephrasing your request or use one of the predefined examples above.
                    </p>
                </div>
            )}
        </div>
    )
}
