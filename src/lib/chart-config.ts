import type { ChartConfig } from '@/components/ui/chart'

// Shared data-viz palette (must stay in sync with --chart-1..5 tokens in globals.css)
export const ANALYTICS_COLORS = [
  '#F97316', // chart-1 (orange)
  '#14B8A6', // chart-2 (teal)
  '#64748B', // chart-3 (slate)
  '#EAB308', // chart-4 (amber)
  '#D97706', // chart-5 (dark orange)
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#0EA5E9', // sky
] as const

export type ChartConfigEntry = { key: string; label: string; color: string }

export function buildConfig(entries: ChartConfigEntry[]): ChartConfig {
  return Object.fromEntries(entries.map((e) => [e.key, { label: e.label, color: e.color }])) as ChartConfig
}
