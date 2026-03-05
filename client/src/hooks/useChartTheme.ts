import { useMemo } from 'react'
import { useThemeContext } from '@/contexts/ThemeContext'

/**
 * Centralized chart theme hook.
 *
 * All ECharts colour tokens live here.  Components just call
 *   const ct = useChartTheme()
 * and use  ct.bg, ct.tooltipBg, etc. – no more scattered ternaries.
 *
 * The values are read from CSS custom-properties defined in index.css,
 * so changing the palette is a one-file operation.
 */
export function useChartTheme() {
    const { resolved } = useThemeContext()

    return useMemo(() => {
        const s = getComputedStyle(document.documentElement)
        const v = (name: string) => s.getPropertyValue(name).trim()

        return {
            // backgrounds
            bg: v('--chart-bg'),
            tooltipBg: v('--chart-tooltip-bg'),
            tooltipBorder: v('--chart-tooltip-border'),

            // text
            text: v('--chart-text'),
            tooltipText: v('--chart-tooltip-text'),
            legendText: v('--chart-legend-text'),
            axisLabel: v('--chart-axis-label'),

            // lines & grid
            axisLine: v('--chart-axis-line'),
            splitLine: v('--chart-split-line'),

            // pie / donut border between slices
            pieBorder: v('--chart-pie-border'),
        }
    }, [resolved])
}
