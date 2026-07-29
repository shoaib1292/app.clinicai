'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { Mail, CheckCircle2, Eye, AlertTriangle, ShieldAlert, Inbox } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

const statusConfig = {
  sent: { label: 'Sent', color: 'var(--chart-1)' },
  delivered: { label: 'Delivered', color: 'var(--chart-2)' },
  opened: { label: 'Opened', color: 'var(--chart-3)' },
  bounced: { label: 'Bounced', color: 'var(--chart-4)' },
  complained: { label: 'Spam complaints', color: 'var(--chart-5)' },
  failed: { label: 'Failed', color: 'var(--muted-foreground)' },
} satisfies ChartConfig

const dailyConfig = {
  sent: { label: 'Sent', color: 'var(--chart-1)' },
  opened: { label: 'Opened', color: 'var(--chart-3)' },
  bounced: { label: 'Bounced', color: 'var(--chart-4)' },
} satisfies ChartConfig

interface EmailAnalytics {
  overview: { sent: number; delivered: number; opened: number; bounced: number; complained: number; failed: number; total: number }
  rates: { delivery: number; open: number; bounce: number; spamComplaint: number }
  statusSplit: { name: string; value: number }[]
  categorySplit: { name: string; value: number }[]
  providerSplit: { name: string; value: number }[]
  daily: { date: string; sent: number; opened: number; bounced: number; delivered: number }[]
  perClinic: { clinicId: string | null; clinicName: string; sent: number }[]
}

export function PlatformEmailAnalyticsClient() {
  const [data, setData] = useState<EmailAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const { lastEvent } = useRealtime('email:analytics')

  const load = () => {
    fetch('/api/platform/email-analytics')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setData(j.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // Realtime: refetch when an open/bounce/complaint event arrives
  useEffect(() => {
    if (lastEvent?.message && (lastEvent.message as any).type) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent])

  if (loading || !data) return <div className="py-12 text-center text-muted-foreground">Loading email analytics…</div>

  const o = data.overview
  const r = data.rates

  return (
    <div className="space-y-8 page-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Analytics</h1>
        <p className="text-muted-foreground">
          Outbound email performance across the platform (transactional, notifications, campaigns)
        </p>
      </div>

      {/* Overview StatCards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Mail} label="Sent" value={o.sent.toLocaleString()} sub={`${o.total} total`} tone="brand" />
        <StatCard icon={CheckCircle2} label="Delivered" value={o.delivered.toLocaleString()} sub={`${r.delivery}%`} tone="success" />
        <StatCard icon={Eye} label="Opened" value={o.opened.toLocaleString()} sub={`${r.open}%`} tone="info" />
        <StatCard icon={AlertTriangle} label="Bounced" value={o.bounced.toLocaleString()} sub={`${r.bounce}%`} tone="destructive" />
        <StatCard icon={ShieldAlert} label="Spam Complaints" value={o.complained.toLocaleString()} sub={`${r.spamComplaint}%`} tone="destructive" />
        <StatCard icon={Inbox} label="Failed" value={o.failed.toLocaleString()} sub="send failures" tone="brand" />
      </div>

      {/* Deliverability / Spam proxy banner */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="py-3 text-xs text-muted-foreground">
          <strong className="text-info">Deliverability / Spam proxy:</strong> Receiving mail servers (Gmail, Yahoo, etc.)
          do not report whether a message landed in the inbox or spam folder, so true inbox placement cannot be measured.
          These numbers are derived from <em>delivery</em>, <em>open</em>, <em>bounce</em>, and{' '}
          <em>spam-complaint</em> signals — a reliable proxy for sender reputation.
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emails over time</CardTitle>
            <CardDescription>Sent vs opened vs bounced (last 14 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dailyConfig} className="h-[250px] w-full">
              <LineChart data={data.daily} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(d) => d.slice(5)} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="sent" stroke="var(--color-sent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" stroke="var(--color-opened)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bounced" stroke="var(--color-bounced)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Split</CardTitle>
            <CardDescription>Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="mx-auto aspect-square max-h-[250px]">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                <Pie
                  data={data.statusSplit.map((s) => ({
                    name: statusConfig[s.name as keyof typeof statusConfig]?.label || s.name,
                    value: s.value,
                    fill: statusConfig[s.name as keyof typeof statusConfig]?.color ?? 'var(--chart-5)',
                  }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-3" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
            <CardDescription>Transactional vs notifications vs campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Emails', color: 'var(--chart-3)' } }} className="h-[250px] w-full">
              <BarChart data={data.categorySplit} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Provider</CardTitle>
            <CardDescription>Brevo SMTP delivery breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Emails', color: 'var(--chart-2)' } }} className="h-[250px] w-full">
              <BarChart data={data.providerSplit} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-clinic table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Clinics by Volume</CardTitle>
          <CardDescription>Clinics generating the most outbound email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-2 font-medium">Clinic</th>
                  <th className="text-right pl-2 font-medium">Emails Sent</th>
                </tr>
              </thead>
              <tbody>
                {data.perClinic.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-muted-foreground">No clinic-tagged emails yet.</td>
                  </tr>
                ) : (
                  data.perClinic.map((c) => (
                    <tr key={c.clinicId || c.clinicName} className="border-b border-border/40 hover:bg-accent/30 transition-colors">
                      <td className="py-2 pr-2 font-medium text-left">{c.clinicName}</td>
                      <td className="text-right pl-2">{c.sent.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type Tone = 'brand' | 'success' | 'destructive' | 'info'
const TONE_STYLES: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'brand',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub: string
  tone?: Tone
}) {
  return (
    <Card className="card-stat">
      <CardContent className="p-4">
        <div className="stat-icon">
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="mt-3 text-2xl font-bold tabular-nums gradient-number">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  )
}
