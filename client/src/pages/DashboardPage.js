import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ReactECharts from 'echarts-for-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatEUR, formatDateDMY } from '@/lib/format';
import { PrivacyNumber } from '@/components/PrivacyNumber';
import { usePrivacy } from '@/contexts/PrivacyContext';
export function DashboardPage() {
    const { hideNumbers } = usePrivacy();
    const [data, setData] = useState(null);
    useEffect(() => {
        api.dashboardSummary().then(setData).catch((error) => {
            console.error('Error loading dashboard data:', error);
            setData({
                netWorth: 0,
                cashFlowLast30Days: 0,
                recentTransactions: [],
                netWorthHistory: [],
                assetAllocation: [],
                expenseBreakdown: []
            });
        });
    }, []);
    if (!data)
        return _jsx("div", { children: "Loading..." });
    const lineOption = {
        xAxis: { type: 'category', data: data.netWorthHistory?.map((d) => formatDateDMY(d.date)) ?? [] },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (value) => hideNumbers ? '••••••' : formatEUR(value)
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                if (hideNumbers) {
                    return `${params[0].name}<br/>Net Worth: ••••••`;
                }
                return `${params[0].name}<br/>Net Worth: ${formatEUR(params[0].value)}`;
            }
        },
        series: [{
                type: 'line',
                symbolSize: 8,
                data: data.netWorthHistory?.map((d, index) => ({
                    value: d.value,
                    label: {
                        show: true,
                        position: index % 2 === 0 ? 'top' : 'bottom',
                        formatter: () => hideNumbers ? '••••••' : formatEUR(d.value),
                        fontSize: 10,
                        distance: 5
                    }
                })) ?? []
            }]
    };
    const donutOption = {
        tooltip: {
            trigger: 'item',
            formatter: (params) => hideNumbers ? `${params.name}: ••••••` : `${params.name}: ${formatEUR(params.value)}`
        },
        series: [{
                type: 'pie',
                radius: ['50%', '70%'],
                data: (data.assetAllocation || []).map((a) => ({
                    name: a.class,
                    value: Number(a.value).toFixed(2) // Limit to 2 decimal places
                }))
            }]
    };
    const barOption = {
        grid: {
            left: '15%',
            right: '5%',
            top: '10%',
            bottom: '20%'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const data = params[0];
                return hideNumbers ? `${data.name}: ••••••` : `${data.name}: ${formatEUR(data.value)}`;
            }
        },
        xAxis: {
            type: 'category',
            data: (data.expenseBreakdown || []).map((e) => e.category),
            axisLabel: {
                show: true,
                interval: 0, // Show all labels
                rotate: 45, // Rotate labels for better readability
                fontSize: 10
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (value) => hideNumbers ? '••••••' : formatEUR(value),
                fontSize: 10
            }
        },
        series: [{
                type: 'bar',
                data: (data.expenseBreakdown || []).map((e) => e.total),
                itemStyle: { color: '#dc2626' },
                label: {
                    show: true,
                    position: 'top',
                    formatter: (params) => hideNumbers ? '••••••' : formatEUR(params.value),
                    fontSize: 10
                }
            }]
    };
    return (_jsx("div", { className: "p-2 sm:p-4", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-4 **lg:items-start**", children: [_jsxs("div", { className: "lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4", children: [_jsxs("div", { className: "bg-white p-3 rounded shadow", children: [_jsx("div", { className: "text-sm text-gray-600", children: "Net Worth" }), _jsx("div", { className: "text-xl sm:text-2xl font-bold", children: _jsx(PrivacyNumber, { value: data.netWorth, children: formatEUR(data.netWorth) }) })] }), _jsxs("div", { className: "bg-white p-3 rounded shadow", children: [_jsx("div", { className: "text-sm text-gray-600", children: "Cash Flow (Current Month)" }), _jsx("div", { className: "text-xl sm:text-2xl font-bold", children: _jsx(PrivacyNumber, { value: data.cashFlowLast30Days || 0, children: formatEUR(data.cashFlowLast30Days || 0) }) })] }), _jsxs("div", { className: "bg-white p-3 rounded shadow sm:col-span-2 lg:col-span-1", children: [_jsx("div", { className: "text-sm text-gray-600", children: "Monthly Expenses" }), _jsx("div", { className: "text-xl sm:text-2xl font-bold", children: _jsx(PrivacyNumber, { value: data.monthlyExpenses || 0, children: formatEUR(data.monthlyExpenses || 0) }) }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: "Total spent this month" })] })] }), _jsxs("div", { className: "lg:col-span-3 grid grid-cols-1 xl:grid-cols-2 gap-4", children: [_jsxs("div", { className: "xl:col-span-2 bg-white p-3 rounded shadow", children: [_jsx("div", { className: "font-semibold mb-1", children: "Net Worth Over Time" }), _jsx(ReactECharts, { option: lineOption, style: { height: 250 } })] }), _jsxs("div", { className: "bg-white p-3 rounded shadow", children: [_jsx("div", { className: "font-semibold mb-1", children: "Asset Allocation" }), _jsx(ReactECharts, { option: donutOption, style: { height: 250 } })] }), _jsxs("div", { className: "bg-white p-3 rounded shadow", children: [_jsx("div", { className: "font-semibold mb-1", children: "Monthly Expense Breakdown" }), _jsx(ReactECharts, { option: barOption, style: { height: 250 } })] })] }), _jsxs("div", { className: "lg:col-span-1 bg-white p-3 rounded shadow", children: [_jsx("div", { className: "font-semibold mb-2", children: "Recent Transactions" }), _jsxs("div", { className: "space-y-1 overflow-y-auto hide-scrollbar max-h-96 lg:max-h-[554px]", children: [(data.recentTransactions || []).map((txn, index) => (_jsx("div", { className: "border-b pb-1 last:border-b-0", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm font-medium truncate", children: txn.notes || 'No notes' }), _jsx("div", { className: "text-xs text-gray-500", children: formatDateDMY(new Date(txn.date)) }), _jsx("div", { className: "text-xs text-gray-400 truncate", children: txn.category?.name || 'Unknown' })] }), _jsx("div", { className: `text-sm font-medium ml-2 ${txn.category?.type === 'Income' ? 'text-green-600' : 'text-red-600'}`, children: _jsxs(PrivacyNumber, { value: txn.amount, children: [txn.category?.type === 'Income' ? '+' : '-', formatEUR(Math.abs(txn.amount))] }) })] }) }, index))), (!data.recentTransactions || data.recentTransactions.length === 0) && (_jsx("div", { className: "text-sm text-gray-500 text-center py-4", children: "No recent transactions" }))] })] })] }) }));
}
