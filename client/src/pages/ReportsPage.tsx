import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { usePrivacy } from '@/contexts/PrivacyContext'
import { useThemeContext } from '@/contexts/ThemeContext'
import dayjs from 'dayjs'
import { ReportControls } from '@/components/reports/ReportControls'
import { ReportSummaryCards } from '@/components/reports/ReportSummaryCards'
import { AverageInsightsPanel } from '@/components/reports/AverageInsightsPanel'
import { NetVsWealthPanel } from '@/components/reports/NetVsWealthPanel'
import { CashFlowChart, CategoryBreakdownChart } from '@/components/reports/ReportCharts'
import { TrendsChart } from '@/components/reports/TrendsChart'
import { AssetGroupComparisonChart } from '@/components/reports/AssetGroupComparisonChart'
import { TagAnalysisSection } from '@/components/reports/TagAnalysisSection'
import { AssetAnalysisSection } from '@/components/reports/AssetAnalysisSection'

export function ReportsPage() {
  const { hideNumbers } = usePrivacy()
  const { resolved: theme } = useThemeContext()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  // --- STATE MANAGEMENT ---
  
  // Controls
  const [isCompareMode, setIsCompareMode] = useState(false)
  
  // Period 1 (Primary) - Default to current month
  const [startDate1, setStartDate1] = useState(dayjs().startOf('month').toDate())
  const [endDate1, setEndDate1] = useState(dayjs().endOf('month').toDate())
  
  // Period 2 (Comparison) - Default to previous month
  const [startDate2, setStartDate2] = useState(dayjs().subtract(1, 'month').startOf('month').toDate())
  const [endDate2, setEndDate2] = useState(dayjs().subtract(1, 'month').endOf('month').toDate())

  // Data
  const [cashflow, setCashflow] = useState<any[]>([])
  const [spending1, setSpending1] = useState<any[]>([]) 
  const [spending2, setSpending2] = useState<any[]>([]) 
  const [categoryAnalysis1, setCategoryAnalysis1] = useState<any[]>([])
  const [categoryAnalysis2, setCategoryAnalysis2] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([]) 
   const [assetGroupComparison, setAssetGroupComparison] = useState<any>(null)
   const [netWorthPrimaryRange, setNetWorthPrimaryRange] = useState<any[]>([])

  const [loading, setLoading] = useState(true)

  // --- DATA FETCHING ---

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const fetchPeriod = async (start: Date, end: Date) => {
           const s = dayjs(start).format('YYYY-MM-DD');
           const e = dayjs(end).format('YYYY-MM-DD');
           return Promise.all([
             api.reports.periodTotals(s, e), // For totals (Income/Expense/Net)
             api.reports.categoryAnalysis(s, e)    // For charts
           ]);
        };

        // Period 1
        const [p1Spending, p1Analysis] = await fetchPeriod(startDate1, endDate1);
        setSpending1(p1Spending || []);
        setCategoryAnalysis1(p1Analysis || []);

        // Period 2 (if compare mode)
        if (isCompareMode) {
           const [p2Spending, p2Analysis] = await fetchPeriod(startDate2, endDate2);
           setSpending2(p2Spending || []);
           setCategoryAnalysis2(p2Analysis || []);
        } else {
           setSpending2([]);
           setCategoryAnalysis2([]);
        }

        // Static/Wide Context Data (Cashflow, Trends, Net Worth)
        // Ensure we show at least 6 months of history for trends, or the user's selected range if longer
        const selectedStart = dayjs(startDate1);
        const selectedEnd = dayjs(endDate1);
        const durationMonths = selectedEnd.diff(selectedStart, 'month');
        
        const trendStart = durationMonths < 6 
            ? selectedEnd.subtract(5, 'month').startOf('month').format('YYYY-MM-DD')
            : selectedStart.format('YYYY-MM-DD');
            
      const trendEnd = selectedEnd.format('YYYY-MM-DD');

      // For net-vs-wealth we need previous month end as baseline (e.g. Feb-Mar => Jan -> Mar).
      const primaryStart = selectedStart.startOf('month').subtract(1, 'month').format('YYYY-MM-DD');
      const primaryEnd = selectedEnd.endOf('month').format('YYYY-MM-DD');
        
             const [cashflowData, trendsData, assetGroupComparisonData, netWorthData] = await Promise.all([
             api.reports.cashflow(trendStart, trendEnd),
             api.reports.trends(trendStart, trendEnd),
                  api.reports.assetGroupComparison(trendStart, trendEnd),
                  api.reports.netWorthTrend(primaryStart, primaryEnd)
        ]);
        
        setCashflow(cashflowData || []);
        setTrends(trendsData || []);
            setAssetGroupComparison(assetGroupComparisonData || null);
            setNetWorthPrimaryRange(Array.isArray(netWorthData) ? netWorthData : []);

      } catch (err) {
        console.error("Failed to load report data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startDate1, endDate1, startDate2, endDate2, isCompareMode]);


  // --- HANDLERS ---

  const handleDrillDown = (params: any) => {
    const categoryName = params?.name ?? params?.data?.name;
    if (categoryName) {
       const search = new URLSearchParams();
       search.set('category', String(categoryName));
       search.set('startDate', dayjs(startDate1).format('YYYY-MM-DD'));
       search.set('endDate', dayjs(endDate1).format('YYYY-MM-DD'));
       navigate(`/transactions?${search.toString()}`);
    } 
     else if (params.name && (params.name.includes('/') || params.name.includes('-'))) { 
         // Date drilldown
         // Support both DD/MM/YYYY and YYYY-MM-DD or Month strings
         const dateStr = params.name;
         // Try to parse with dayjs
         let mDate = dayjs(dateStr, 'DD/MM/YYYY');
         if (!mDate.isValid()) mDate = dayjs(dateStr);
         
         if (mDate.isValid()) {
             const startOfMonth = mDate.startOf('month').format('YYYY-MM-DD');
             const endOfMonth = mDate.endOf('month').format('YYYY-MM-DD');
             
             const search = new URLSearchParams();
             search.set('startDate', startOfMonth);
             search.set('endDate', endOfMonth);
             navigate(`/transactions?${search.toString()}`);
         }
     }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
       {/* Full Width Container */}
       <div className="w-full px-6 sm:px-8 lg:px-12 py-6 space-y-6 pb-24">
          
          {/* Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
             <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f0f0f0] tracking-tight">Financial Reports</h1>
                <p className="text-slate-500 dark:text-[#888] mt-1 text-sm">Spending habits and financial health</p>
             </div>
             
             <ReportControls 
                isCompareMode={isCompareMode}
                setIsCompareMode={setIsCompareMode}
                startDate1={startDate1}
                setStartDate1={setStartDate1}
                endDate1={endDate1}
                setEndDate1={setEndDate1}
                startDate2={startDate2}
                setStartDate2={setStartDate2}
                endDate2={endDate2}
                setEndDate2={setEndDate2}
             />
          </div>

          {/* Summary Cards */}
          <ReportSummaryCards 
             isCompareMode={isCompareMode}
             spending1={spending1}
             spending2={spending2}
             loading={loading}
          />

               <AverageInsightsPanel
                  spending={spending1}
                  categoryAnalysis={categoryAnalysis1}
                  startDate={startDate1}
                  endDate={endDate1}
                  isCompareMode={isCompareMode}
                  loading={loading}
               />

               <NetVsWealthPanel
                  spending={spending1}
                  netWorthSeries={netWorthPrimaryRange}
                  startDate={startDate1}
                  endDate={endDate1}
                  loading={loading}
               />

          {/* Main Analysis Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             {/* Cash Flow */}
             <div className="min-h-[400px]">
                <CashFlowChart 
                    data={cashflow} 
                    hideNumbers={hideNumbers}
                    isDark={isDark}
                    onDrillDown={handleDrillDown}
                    loading={loading}
                />
             </div>

             {/* Category Breakdown */}
             <div className="min-h-[400px]">
                <CategoryBreakdownChart 
                    data={categoryAnalysis1}
                    data2={categoryAnalysis2}
                    isCompareMode={isCompareMode}
                    hideNumbers={hideNumbers}
                    isDark={isDark}
                    onDrillDown={handleDrillDown}
                    loading={loading}
                />
             </div>
          </div>
          
           {/* Trends & Net Worth */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <TrendsChart 
                  data={trends} 
                  isDark={isDark} 
                  loading={loading} 
               />
               <AssetGroupComparisonChart 
                  data={assetGroupComparison} 
                  isDark={isDark} 
                  hideNumbers={hideNumbers}
                  loading={loading} 
               />
           </div>

          {/* Tag Section */}
          <TagAnalysisSection isDark={isDark} startDate={startDate1} endDate={endDate1} />

          {/* Asset Section */}
          <AssetAnalysisSection isDark={isDark} startDate={startDate1} endDate={endDate1} />

       </div>
    </div>
  )
}
