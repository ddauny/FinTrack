import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ReportsPage } from './ReportsPage'
import { MonthlySummaryPage } from './MonthlySummaryPage'
import { TrendsPage } from './TrendsPage'
import { PortfolioAnalyticsPage } from './PortfolioAnalyticsPage'
import { AiReportsPage } from './AiReportsPage'

type ViewType = 'overview' | 'monthly' | 'trends' | 'portfolio' | 'ai'

export function AnalyticsWorkspace() {
    const location = useLocation()
    const navigate = useNavigate()
    const [activeView, setActiveView] = useState<ViewType>('overview')
    const [visitedViews, setVisitedViews] = useState<Set<ViewType>>(new Set<ViewType>(['overview']))

    // Sync state with URL if needed, or just use internal state
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const v = params.get('view') as ViewType
        if (v && ['overview', 'monthly', 'trends', 'portfolio', 'ai'].includes(v)) {
            setActiveView(v)
            setVisitedViews(prev => {
                const next = new Set(prev)
                next.add(v)
                return next
            })
        }
    }, [location.search])

    const handleViewChange = (view: ViewType) => {
        setActiveView(view)
        setVisitedViews(prev => {
            const next = new Set(prev)
            next.add(view)
            return next
        })
        // Optionally update URL to allow bookmarking specific views
        const params = new URLSearchParams(location.search)
        params.set('view', view)
        navigate({ search: params.toString() }, { replace: true })
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'monthly', label: 'Monthly', icon: '📅' },
        { id: 'trends', label: 'Trends', icon: '📈' },
        { id: 'portfolio', label: 'Portfolio', icon: '💼' },
        { id: 'ai', label: 'AI Analysis', icon: '✨' },
    ]

    return (
        <div className="flex flex-col h-[calc(100vh-52px)] bg-slate-50 dark:bg-[#070707]">
            {/* Sub-Navigation Bar */}
            <div className="z-30 border-b border-slate-200 dark:border-[#1a1a1a] bg-white dark:bg-[#0c0c0c] px-4 py-0 sm:px-6">
                <div className="mx-auto max-w-[1800px] flex items-center justify-between">
                    <div className="flex items-center gap-0 overflow-x-auto hide-scrollbar max-w-full">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleViewChange(tab.id as ViewType)}
                                className={`flex items-center gap-2 px-5 py-4 text-[11px] font-bold uppercase tracking-widest transition-all relative shrink-0 ${
                                    activeView === tab.id
                                        ? 'text-blue-600 dark:text-blue-500'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                                }`}
                            >
                                <span className="opacity-70">{tab.icon}</span>
                                <span>{tab.label}</span>
                                {activeView === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />
                                )}
                            </button>
                        ))}
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                        <span className="flex items-center gap-1.5 border-l border-slate-200 dark:border-[#1a1a1a] pl-4 h-4">
                            Analytics Engine v1.0
                        </span>
                    </div>
                </div>
            </div>

            {/* View Container */}
            <div className="flex-1 overflow-hidden relative">
                <div className="h-full w-full mx-auto max-w-[1800px]">
                    <div className={`h-full w-full ${activeView === 'overview' ? 'animate-page-entry' : 'hidden'}`}>
                        {visitedViews.has('overview') && <ReportsPage />}
                    </div>
                    <div className={`h-full w-full ${activeView === 'monthly' ? 'animate-page-entry' : 'hidden'}`}>
                        {visitedViews.has('monthly') && <MonthlySummaryPage />}
                    </div>
                    <div className={`h-full w-full ${activeView === 'trends' ? 'animate-page-entry' : 'hidden'}`}>
                        {visitedViews.has('trends') && <TrendsPage />}
                    </div>
                    <div className={`h-full w-full ${activeView === 'portfolio' ? 'animate-page-entry' : 'hidden'}`}>
                        {visitedViews.has('portfolio') && <PortfolioAnalyticsPage />}
                    </div>
                    <div className={`h-full w-full ${activeView === 'ai' ? 'animate-page-entry' : 'hidden'}`}>
                        {visitedViews.has('ai') && <AiReportsPage />}
                    </div>
                </div>
            </div>
        </div>
    )
}
