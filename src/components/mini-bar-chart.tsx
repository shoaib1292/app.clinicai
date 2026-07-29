'use client'

import { useMemo } from 'react'

export interface BarPoint {
  label: string
  value: number
  highlight?: boolean
}

interface MiniBarChartProps {
  data: BarPoint[]
  height?: number
  className?: string
  colorClass?: string
  highlightColorClass?: string
  valuePrefix?: string
  valueSuffix?: string
}

/**
 * Lightweight zero-dependency SVG bar chart with hover tooltips.
 * Renders inline — perfect for dashboard widgets.
 */
export function MiniBarChart({
  data,
  height = 80,
  className,
  colorClass = 'fill-brand',
  highlightColorClass = 'fill-brand',
  valuePrefix = '',
  valueSuffix = '',
}: MiniBarChartProps) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data])
  const barWidth = 100 / Math.max(data.length, 1)

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 14)
          const x = i * barWidth + barWidth * 0.15
          const w = barWidth * 0.7
          const y = height - 14 - h
          return (
            <g key={i} className="group">
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(h, 1)}
                rx={1.2}
                className={d.highlight ? highlightColorClass : colorClass}
                opacity={d.value === 0 ? 0.25 : 0.85}
              >
                <title>{`${d.label}: ${valuePrefix}${d.value}${valueSuffix}`}</title>
              </rect>
              <text
                x={x + w / 2}
                y={height - 3}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: '3.4px', fontWeight: 500 }}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
