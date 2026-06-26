import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { Transaction, Category } from '../types'

export function AiReportsPage() {
    const [prompt, setPrompt] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<Transaction[]>([])
    const [filterApplied, setFilterApplied] = useState<any>(null)
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
        try {
            const data = await api.transactions.aiQuery(prompt)
            setResults(data.items)
            setFilterApplied(data.filterApplied)
        } catch (err: any) {
            console.error('AI Query Error:', err)
            setError(err.message || 'Failed to fetch AI results')
        } finally {
            setLoading(false)
        }
    }

    const examples = [
        "Expenses from last month",
        "All transactions related to Amazon",
        "How much did I spend on restaurants in May?",
        "Income over 1000 euros in 2024",
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
            <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom stagger-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                    <span className="text-blue-500">✨</span> AI Analysis
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                    Query your financial data using natural language processing.
                </p>
            </div>

            <div className="bg-white dark:bg-[#0c0c0c] rounded-xl border border-slate-200 dark:border-[#1a1a1a] p-5 shadow-sm animate-in fade-in slide-in-from-bottom stagger-2">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Search for 'restaurant expenses in April'..."
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

            {results.length > 0 ? (
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
            ) : prompt && !loading && !error && (
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
