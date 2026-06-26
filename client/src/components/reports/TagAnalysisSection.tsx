import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { default as DatePicker } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { formatEUR } from '@/lib/format';

// Type assertion for DatePicker to fix TS error
const DatePickerComponent = DatePicker as any;

interface TagAnalysisSectionProps {
  isDark: boolean;
  startDate: Date;
  endDate: Date;
}

export const TagAnalysisSection: React.FC<TagAnalysisSectionProps> = ({ isDark, startDate, endDate }) => {
  const { hideNumbers } = usePrivacy();
  const [tagAnalysis, setTagAnalysis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const chartTextColor = isDark ? '#f5f5f5' : '#171717';

  useEffect(() => {
    const fetchTagData = async () => {
      setLoading(true);
      try {
        const startStr = dayjs(startDate).format('YYYY-MM-DD');
        const endStr = dayjs(endDate).format('YYYY-MM-DD');
        const data = await api.reports.tagAnalysis(startStr, endStr);
        setTagAnalysis(data || []);
      } catch (err) {
        console.error('Error loading tag analysis:', err);
        setTagAnalysis([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTagData();
  }, [startDate, endDate]);

  const option = useMemo(() => ({
     textStyle: { fontFamily: 'Inter, sans-serif', color: chartTextColor },
     tooltip: {
      transitionDuration: 0, 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#141414' : '#ffffff', 
        borderColor: isDark ? '#141414' : '#e5e7eb',
        textStyle: { color: isDark ? '#e2e8f0' : '#374151' },
        formatter: (params: any) => {
            const val = hideNumbers ? '••••••' : formatEUR(params[0].value);
            return `<div class="font-medium">${params[0].name}</div>
                    <div class="text-slate-500 text-sm">Expense: ${val}</div>`;
        }
     },
     grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
     xAxis: { 
        type: 'value', 
        axisLabel: { 
            color: chartTextColor,
            formatter: (val: number) => hideNumbers ? '•••' : val >= 1000 ? (val/1000).toFixed(0)+'k' : val
        },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' } }
    },
     yAxis: { 
        type: 'category', 
        data: tagAnalysis.map(t => t.tag), 
        axisLabel: { color: chartTextColor } 
     },
     series: [{
        name: 'Expense',
        type: 'bar',
        data: tagAnalysis.map(t => Math.abs(t.total)),
        itemStyle: { color: '#f59e0b', borderRadius: [0, 4, 4, 0] },
        label: {
            show: true,
            position: 'right',
            formatter: (p: any) => hideNumbers ? '' : formatEUR(p.value),
            color: chartTextColor
        }
     }]
  }), [tagAnalysis, isDark, chartTextColor, hideNumbers]);

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-[#f0f0f0]">Top Tags Analysis</h3>
        </div>
        <div className="bg-white dark:bg-[#111111] p-5 rounded-lg border border-slate-200 dark:border-[#1f1f1f] min-h-[350px]">
            {loading ? (
                 <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                 </div>
            ) : tagAnalysis.length > 0 ? (
                <ReactECharts option={option} style={{ height: 300 }} />
            ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
                    No tag data for this period
                </div>
            )}
        </div>
    </div>
  );
};
