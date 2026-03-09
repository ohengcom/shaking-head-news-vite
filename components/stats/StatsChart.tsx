'use client'

import { useTranslations } from 'next-intl'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'

interface ChartData {
  date: string
  count: number
  duration: number
}

interface StatsChartProps {
  data: ChartData[]
  type: 'week' | 'month'
}

interface CustomTooltipContentProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
  label?: string
  durationLabel: string
  minutesLabel: string
}

function CustomTooltipContent({
  active,
  payload,
  label,
  durationLabel,
  minutesLabel,
}: CustomTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
      <p className="mb-2 text-sm font-medium">{label}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.name}-${index}`} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
          {entry.name === durationLabel ? ` ${minutesLabel}` : ''}
        </p>
      ))}
    </div>
  )
}

/**
 * 统计图表组件
 * 需求: 8.5 - 使用 Recharts 提供可视化图表展示运动趋势
 */
export function StatsChart({ data, type }: StatsChartProps) {
  const t = useTranslations('stats')
  const { theme } = useTheme()
  const rotationCountLabel = t('rotationCount')
  const durationLabel = t('duration')
  const minutesLabel = t('minutes')

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 准备图表数据
  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    [rotationCountLabel]: item.count,
    [durationLabel]: Math.round(item.duration / 60), // 转换为分钟
  }))

  // 主题颜色
  const colors = {
    primary: theme === 'dark' ? '#60a5fa' : '#3b82f6',
    secondary: theme === 'dark' ? '#34d399' : '#10b981',
    grid: theme === 'dark' ? '#374151' : '#e5e7eb',
    text: theme === 'dark' ? '#9ca3af' : '#6b7280',
  }

  if (type === 'week') {
    // 本周使用柱状图
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey="date" stroke={colors.text} fontSize={12} tickLine={false} />
          <YAxis stroke={colors.text} fontSize={12} tickLine={false} />
          <Tooltip
            content={
              <CustomTooltipContent durationLabel={durationLabel} minutesLabel={minutesLabel} />
            }
          />
          <Bar dataKey={rotationCountLabel} fill={colors.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // 本月使用折线图
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis dataKey="date" stroke={colors.text} fontSize={12} tickLine={false} />
        <YAxis stroke={colors.text} fontSize={12} tickLine={false} />
        <Tooltip
          content={
            <CustomTooltipContent durationLabel={durationLabel} minutesLabel={minutesLabel} />
          }
        />
        <Line
          type="monotone"
          dataKey={rotationCountLabel}
          stroke={colors.primary}
          strokeWidth={2}
          dot={{ fill: colors.primary, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey={durationLabel}
          stroke={colors.secondary}
          strokeWidth={2}
          dot={{ fill: colors.secondary, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
