'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ChartData {
  date: string
  count: number
  duration: number
}

interface StatsChartProps {
  data: ChartData[]
  type: 'week' | 'month'
}

interface StatsChartDatum {
  date: string
  label: string
  count: number
  durationMinutes: number
}

interface LinePoint {
  x: number
  y: number
}

const VIEWBOX_WIDTH = 640
const VIEWBOX_HEIGHT = 300
const CHART_PADDING = {
  top: 20,
  right: 16,
  bottom: 42,
  left: 42,
}
const CHART_INNER_WIDTH = VIEWBOX_WIDTH - CHART_PADDING.left - CHART_PADDING.right
const CHART_INNER_HEIGHT = VIEWBOX_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

function getNiceMax(value: number) {
  if (value <= 0) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude

  if (normalized <= 1) {
    return magnitude
  }

  if (normalized <= 2) {
    return 2 * magnitude
  }

  if (normalized <= 5) {
    return 5 * magnitude
  }

  return 10 * magnitude
}

function getYAxisTicks(maxValue: number, segments: number = 4) {
  const safeMax = getNiceMax(maxValue)
  const step = safeMax / segments

  return Array.from({ length: segments + 1 }, (_, index) => safeMax - step * index)
}

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getXPosition(index: number, total: number) {
  if (total <= 1) {
    return CHART_PADDING.left + CHART_INNER_WIDTH / 2
  }

  return CHART_PADDING.left + (CHART_INNER_WIDTH / (total - 1)) * index
}

function getYPosition(value: number, maxValue: number) {
  const ratio = maxValue > 0 ? value / maxValue : 0
  return CHART_PADDING.top + CHART_INNER_HEIGHT - ratio * CHART_INNER_HEIGHT
}

function getLinePoints(values: number[], maxValue: number): LinePoint[] {
  return values.map((value, index) => ({
    x: getXPosition(index, values.length),
    y: getYPosition(value, maxValue),
  }))
}

function getInteractiveSlot(index: number, total: number) {
  if (total <= 1) {
    return {
      x: CHART_PADDING.left,
      width: CHART_INNER_WIDTH,
    }
  }

  const currentX = getXPosition(index, total)
  const previousX = getXPosition(Math.max(index - 1, 0), total)
  const nextX = getXPosition(Math.min(index + 1, total - 1), total)

  const start = index === 0 ? CHART_PADDING.left : (previousX + currentX) / 2
  const end = index === total - 1 ? VIEWBOX_WIDTH - CHART_PADDING.right : (currentX + nextX) / 2

  return {
    x: start,
    width: Math.max(end - start, 1),
  }
}

function shouldRenderXAxisLabel(index: number, total: number) {
  if (total <= 8) {
    return true
  }

  const interval = Math.max(1, Math.ceil((total - 1) / 5))
  return index === 0 || index === total - 1 || index % interval === 0
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground border-border/60 bg-muted/20 flex h-[300px] items-center justify-center rounded-xl border border-dashed text-sm">
      {message}
    </div>
  )
}

function ChartSummary({
  datum,
  rotationCountLabel,
  durationLabel,
  minutesLabel,
}: {
  datum: StatsChartDatum
  rotationCountLabel: string
  durationLabel: string
  minutesLabel: string
}) {
  return (
    <div className="border-border/60 bg-muted/25 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{datum.label}</p>
        <p className="text-muted-foreground text-xs">{datum.date}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium text-[hsl(var(--primary))]">
          {rotationCountLabel}: {datum.count}
        </span>
        <span className="font-medium text-[hsl(var(--secondary))]">
          {durationLabel}: {datum.durationMinutes} {minutesLabel}
        </span>
      </div>
    </div>
  )
}

function MonthLegend({
  rotationCountLabel,
  durationLabel,
}: {
  rotationCountLabel: string
  durationLabel: string
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
        {rotationCountLabel}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--secondary))]" />
        {durationLabel}
      </span>
    </div>
  )
}

function WeekBarChart({
  chartData,
  activeIndex,
  onActivate,
  onDeactivate,
  rotationCountLabel,
  durationLabel,
  minutesLabel,
}: {
  chartData: StatsChartDatum[]
  activeIndex: number
  onActivate: (index: number) => void
  onDeactivate: () => void
  rotationCountLabel: string
  durationLabel: string
  minutesLabel: string
}) {
  const maxValue = getNiceMax(Math.max(...chartData.map((item) => item.count), 1))
  const ticks = getYAxisTicks(maxValue)
  const slotWidth = CHART_INNER_WIDTH / chartData.length
  const barWidth = Math.min(40, Math.max(18, slotWidth * 0.58))

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className="h-[300px] w-full overflow-visible"
      role="img"
      aria-label={rotationCountLabel}
      onMouseLeave={onDeactivate}
    >
      {ticks.map((tick) => {
        const y = getYPosition(tick, maxValue)

        return (
          <g key={tick}>
            <line
              x1={CHART_PADDING.left}
              x2={VIEWBOX_WIDTH - CHART_PADDING.right}
              y1={y}
              y2={y}
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
            />
            <text
              x={CHART_PADDING.left - 8}
              y={y + 4}
              fontSize="12"
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
            >
              {Math.round(tick)}
            </text>
          </g>
        )
      })}

      {chartData.map((item, index) => {
        const isActive = index === activeIndex
        const valueHeight = (item.count / maxValue) * CHART_INNER_HEIGHT
        const x = CHART_PADDING.left + slotWidth * index + (slotWidth - barWidth) / 2
        const y = CHART_PADDING.top + CHART_INNER_HEIGHT - valueHeight

        return (
          <g key={item.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(valueHeight, 4)}
              rx={10}
              fill={isActive ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'}
              opacity={isActive ? 0.96 : 0.84}
            />
            {isActive ? (
              <text
                x={x + barWidth / 2}
                y={Math.max(y - 10, CHART_PADDING.top)}
                fontSize="12"
                textAnchor="middle"
                fill="hsl(var(--foreground))"
              >
                {item.count}
              </text>
            ) : null}
            <text
              x={x + barWidth / 2}
              y={VIEWBOX_HEIGHT - 14}
              fontSize="12"
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              {item.label}
            </text>
            <rect
              x={CHART_PADDING.left + slotWidth * index}
              y={CHART_PADDING.top}
              width={slotWidth}
              height={CHART_INNER_HEIGHT + CHART_PADDING.bottom}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${item.label}, ${rotationCountLabel}: ${item.count}, ${durationLabel}: ${item.durationMinutes} ${minutesLabel}`}
              onMouseEnter={() => onActivate(index)}
              onFocus={() => onActivate(index)}
              onBlur={onDeactivate}
            />
          </g>
        )
      })}
    </svg>
  )
}

function MonthLineChart({
  chartData,
  activeIndex,
  onActivate,
  onDeactivate,
  rotationCountLabel,
  durationLabel,
  minutesLabel,
}: {
  chartData: StatsChartDatum[]
  activeIndex: number
  onActivate: (index: number) => void
  onDeactivate: () => void
  rotationCountLabel: string
  durationLabel: string
  minutesLabel: string
}) {
  const maxValue = getNiceMax(
    Math.max(...chartData.flatMap((item) => [item.count, item.durationMinutes]), 1)
  )
  const ticks = getYAxisTicks(maxValue)
  const countPoints = getLinePoints(
    chartData.map((item) => item.count),
    maxValue
  )
  const durationPoints = getLinePoints(
    chartData.map((item) => item.durationMinutes),
    maxValue
  )
  const activeX = countPoints[activeIndex]?.x ?? CHART_PADDING.left

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className="h-[300px] w-full overflow-visible"
      role="img"
      aria-label={`${rotationCountLabel} and ${durationLabel}`}
      onMouseLeave={onDeactivate}
    >
      {ticks.map((tick) => {
        const y = getYPosition(tick, maxValue)

        return (
          <g key={tick}>
            <line
              x1={CHART_PADDING.left}
              x2={VIEWBOX_WIDTH - CHART_PADDING.right}
              y1={y}
              y2={y}
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
            />
            <text
              x={CHART_PADDING.left - 8}
              y={y + 4}
              fontSize="12"
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
            >
              {Math.round(tick)}
            </text>
          </g>
        )
      })}

      <line
        x1={activeX}
        x2={activeX}
        y1={CHART_PADDING.top}
        y2={CHART_PADDING.top + CHART_INNER_HEIGHT}
        stroke="hsl(var(--border))"
        strokeDasharray="4 4"
      />

      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={countPoints.map((point) => `${point.x},${point.y}`).join(' ')}
      />
      <polyline
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={durationPoints.map((point) => `${point.x},${point.y}`).join(' ')}
      />

      {chartData.map((item, index) => {
        const countPoint = countPoints[index]
        const durationPoint = durationPoints[index]
        const slot = getInteractiveSlot(index, chartData.length)
        const isActive = index === activeIndex

        return (
          <g key={item.date}>
            <circle
              cx={countPoint.x}
              cy={countPoint.y}
              r={isActive ? 5 : 4}
              fill="hsl(var(--primary))"
            />
            <circle
              cx={durationPoint.x}
              cy={durationPoint.y}
              r={isActive ? 5 : 4}
              fill="hsl(var(--secondary))"
            />
            {shouldRenderXAxisLabel(index, chartData.length) ? (
              <text
                x={countPoint.x}
                y={VIEWBOX_HEIGHT - 14}
                fontSize="12"
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
              >
                {item.label}
              </text>
            ) : null}
            <rect
              x={slot.x}
              y={CHART_PADDING.top}
              width={slot.width}
              height={CHART_INNER_HEIGHT + CHART_PADDING.bottom}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${item.label}, ${rotationCountLabel}: ${item.count}, ${durationLabel}: ${item.durationMinutes} ${minutesLabel}`}
              onMouseEnter={() => onActivate(index)}
              onFocus={() => onActivate(index)}
              onBlur={onDeactivate}
            />
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Lightweight SVG statistics chart.
 * Replaces the previous charting-library dependency to keep the stats route small.
 */
export function StatsChart({ data, type }: StatsChartProps) {
  const t = useTranslations('stats')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const rotationCountLabel = t('rotationCount')
  const durationLabel = t('duration')
  const minutesLabel = t('minutes')
  const chartData: StatsChartDatum[] = data.map((item) => ({
    date: item.date,
    label: formatDateLabel(item.date),
    count: item.count,
    durationMinutes: Math.round(item.duration / 60),
  }))

  if (chartData.length === 0) {
    return <ChartEmptyState message={t('noData')} />
  }

  const defaultIndex = chartData.length - 1
  const activeIndex = hoveredIndex ?? defaultIndex
  const activeDatum = chartData[activeIndex] ?? chartData[defaultIndex]

  return (
    <div className="space-y-4">
      {type === 'week' ? (
        <WeekBarChart
          chartData={chartData}
          activeIndex={activeIndex}
          onActivate={setHoveredIndex}
          onDeactivate={() => setHoveredIndex(null)}
          rotationCountLabel={rotationCountLabel}
          durationLabel={durationLabel}
          minutesLabel={minutesLabel}
        />
      ) : (
        <MonthLineChart
          chartData={chartData}
          activeIndex={activeIndex}
          onActivate={setHoveredIndex}
          onDeactivate={() => setHoveredIndex(null)}
          rotationCountLabel={rotationCountLabel}
          durationLabel={durationLabel}
          minutesLabel={minutesLabel}
        />
      )}
      {type === 'month' ? (
        <MonthLegend rotationCountLabel={rotationCountLabel} durationLabel={durationLabel} />
      ) : null}
      <ChartSummary
        datum={activeDatum}
        rotationCountLabel={rotationCountLabel}
        durationLabel={durationLabel}
        minutesLabel={minutesLabel}
      />
    </div>
  )
}
