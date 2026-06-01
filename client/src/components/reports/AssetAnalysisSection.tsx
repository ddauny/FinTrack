import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { default as DatePicker } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { formatEUR } from '@/lib/format';
import { PrivacyNumber } from '@/components/PrivacyNumber';
import { AssetAllocationChangesChart } from '@/components/reports/AssetAllocationChangesChart';

// Type assertion for DatePicker
const DatePickerComponent = DatePicker as any;

interface AssetAnalysisSectionProps {
  isDark: boolean;
  startDate: Date;
  endDate: Date;
}

export const AssetAnalysisSection: React.FC<AssetAnalysisSectionProps> = ({ isDark, startDate, endDate }) => {
  const { hideNumbers } = usePrivacy();
  
  const [allocationChanges, setAllocationChanges] = useState<any[]>([]);
  const [assetDistribution, setAssetDistribution] = useState<any[]>([]);
  const [topAssetsEvolution, setTopAssetsEvolution] = useState<any[]>([]); // Initialize as array
  const [loading, setLoading] = useState(false);

  const chartTextColor = isDark ? '#f5f5f5' : '#171717';

  useEffect(() => {
    const fetchAssetData = async () => {
      setLoading(true);
      try {
        const today = dayjs();
        const selectedDate = dayjs(endDate);
        
        // If selected date is the current month, fallback to previous month 
        // as "latest complete data" (since current month is likely incomplete).
        const isCurrentMonth = selectedDate.isSame(today, 'month');
        const targetDate = isCurrentMonth ? selectedDate.subtract(1, 'month') : selectedDate;
        
        // To calculate "Month Performance" (e.g. Jan), we need range covering Dec and Jan.
        // We capture from the start of the previous month to the end of the target month.
        const analysisStart = targetDate.subtract(1, 'month').startOf('month');
        const analysisEnd = targetDate.endOf('month');
        
        // Formats for API calls
        const startStr = analysisStart.format('YYYY-MM-DD');
        const endStr = analysisEnd.format('YYYY-MM-DD');
        
        // For allocation history chart: Show at least 6 months trend
        const selectedStart = dayjs(startDate);
        const selectedEnd = dayjs(endDate);
        const durationMonths = selectedEnd.diff(selectedStart, 'month');
        
        const chartStartStr = durationMonths < 6 
            ? selectedEnd.subtract(5, 'month').startOf('month').format('YYYY-MM-DD')
            : selectedStart.format('YYYY-MM-DD');
        
        const [allocationData, distributionData, topAssetsData] = await Promise.all([
          api.reports.assetAllocationChanges(chartStartStr, endStr),
          api.reports.assetDistribution(startStr, endStr),
          // Fetch evolution across the two-month window to catch the change
          api.reports.topAssetsEvolution(startStr, endStr, 100)
        ]);
        
        const allocationSeries = Array.isArray(allocationData) ? allocationData.slice(-4) : [];
        setAllocationChanges(allocationSeries);
        setAssetDistribution(distributionData || []);
        setTopAssetsEvolution(Array.isArray(topAssetsData) ? topAssetsData : []);
      } catch (error) {
        console.error('Error loading asset data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetData();
  }, [startDate, endDate]);

  const assetDistributionOption = useMemo(() => ({
    textStyle: { color: chartTextColor, fontFamily: 'Inter, sans-serif' },
    tooltip: { 
        trigger: 'item', 
        backgroundColor: isDark ? '#141414' : '#ffffff', 
        borderColor: isDark ? '#141414' : '#e5e7eb', 
        textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
        formatter: (params: any) => {
            const val = hideNumbers ? '••••••' : formatEUR(params.value);
            return `<div class="font-medium">${params.name}</div>
                    <div class="text-xs text-slate-500">${val} (${params.percent}%)</div>`;
        }
    },
    legend: {
        bottom: '0%',
        left: 'center',
        padding: [10, 0, 0, 0],
        textStyle: { color: chartTextColor }
    },
    series: [
      {
        name: 'Asset Allocation',
        type: 'pie',
        radius: ['55%', '85%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 5, borderColor: isDark ? '#141414' : '#ffffff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { 
            label: { show: true, fontSize: '20', fontWeight: 'bold', color: chartTextColor },
            scale: true,
            scaleSize: 10 
        },
        labelLine: { show: false },
        data: assetDistribution.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }), [assetDistribution, isDark, chartTextColor, hideNumbers]);
  
  // Helper to determining display date
  const getDisplayDateRange = () => {
    const today = dayjs();
    const selectedDate = dayjs(endDate);
    const isCurrentMonth = selectedDate.isSame(today, 'month');
    const targetDate = isCurrentMonth ? selectedDate.subtract(1, 'month') : selectedDate;
    const prevDate = targetDate.subtract(1, 'month');
    
    return `${targetDate.format('MMM YYYY')} vs ${prevDate.format('MMM YYYY')}`;
  };

  return (
    <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-[#1f1f1f]">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-[#f0f0f0]">
                Investment Portfolio
            </h2>
             {/* Period filter is now controlled by the parent Reports page */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Trend */}
            <AssetAllocationChangesChart 
              data={allocationChanges}
              isDark={isDark}
              hideNumbers={hideNumbers}
              loading={loading}
            />

            {/* Asset Allocation */}
            <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0] mb-4">Current Allocation</h3>
                {loading ? <div className="h-[300px] animate-pulse bg-slate-100 dark:bg-[#101010] rounded-xl"></div> :
                    <ReactECharts option={assetDistributionOption} style={{ height: 300 }} />
                }
            </div>
            
            {/* Asset Table (Top Assets) */}
            <div className="col-span-1 lg:col-span-2 bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f]">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0]">Asset Performance</h3>
                    <p className="text-sm text-slate-500 dark:text-[#888] capitalize">
                        {getDisplayDateRange()}
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-[#888]">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-[#101010]/50 dark:text-[#888]">
                            <tr>
                                <th scope="col" className="px-6 py-3 rounded-l-lg">Asset</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3 text-right">Current Value</th>
                                <th scope="col" className="px-6 py-3 rounded-r-lg text-right">Period Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topAssetsEvolution?.length > 0 ? [...topAssetsEvolution]
                                .sort((a: any, b: any) => b.change - a.change)
                                .map((asset: any, index: number) => (
                                <tr key={index} className="bg-white dark:bg-[#111111] hover:bg-slate-50 dark:hover:bg-[#242424] dark:bg-[#1a1a1a] transition-colors border-b border-slate-100 dark:border-[#1f1f1f] last:border-0">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#f0f0f0]">{asset.name}</td>
                                    <td className="px-6 py-4">{asset.category}</td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        <PrivacyNumber>{formatEUR(asset.value)}</PrivacyNumber>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {Number(asset.change) > 0 ? '+' : ''}{Number(asset.change || 0).toFixed(2)}%
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                        No asset data available for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
