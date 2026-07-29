'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { AnimatedCounter } from '@/components/animated-counter'

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
  trend?: number
  prefix?: string
  pulse?: boolean
  className?: string
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-primary',
  trend,
  prefix = '',
  pulse,
  className,
}: MetricCardProps) {
  const showTrend = typeof trend === 'number' && trend !== 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <Icon className={cn('w-5 h-5', color)} />
            {pulse && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            {showTrend && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
                  trend! > 0 ? 'text-emerald-600' : 'text-destructive',
                )}
              >
                {trend! > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {Math.abs(trend!)}%
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {typeof value === 'number' ? <AnimatedCounter value={value} prefix={prefix} /> : `${prefix}${value}`}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            {sub && <span className="text-[10px] text-muted-foreground/70">{sub}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
