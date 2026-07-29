'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { TrendingUp, TrendingDown, Users, CalendarDays, DollarSign, AlertTriangle, Activity, Star, Clock, Repeat, Stethoscope } from 'lucide-react'

interface AdvancedAnalytics {
  overview: {
    totalAppointments: number
    completedAppointments: number
    noShowRate: number
    avgRating: number
    totalRevenue: number
    activePatients: number
    churnRate: number
    avgWaitMins: number
  }
  revenueForecast: Array<{ month: string; actual: number; forecast: number }>
  churnData: Array<{ month: string; rate: number; retained: number }>
  peakHours: Array<{ hour: number; count: number; revenue: number }>
  doctorBenchmarks: Array<{
    doctorId: string
    doctorName: string
    avgRating: number
    completionRate: number
    noShowRate: number
    avgWaitMins: number
    totalPatients: number
    revenuePerPatient: number
  }>
  patientCohorts: Array<{
    month: string
    newPatients: number
    returningPatients: number
    churned: number
  }>
  weekdayDistribution: Array<{ day: string; count: number; revenue: number }>
  serviceMix: Array<{ service: string; count: number; revenue: number }>
  appointmentTypeMix: Array<{ type: string; count: number; revenue: number }>
  repeatPatientRate: number
  avgVisitsPerPatient: number
  avgBookingLeadHrs: number
}

const doctorConfig = {
  Rating: { label: 'Avg Rating', color: 'var(--chart-2)' },
  Completion: { label: 'Completion %', color: 'var(--chart-3)' },
  NoShow: { label: 'No-Show %', color: 'var(--chart-1)' },
} satisfies ChartConfig

const cohortConfig = {
  New: { label: 'New', color: 'var(--chart-2)' },
  Returning: { label: 'Returning', color: 'var(--chart-3)' },
  Churned: { label: 'Churned', color: 'var(--chart-1)' },
} satisfies ChartConfig

const MIX_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--muted-foreground)']

export function ClinicAnalyticsClient({ clinicId }: { clinicId: string }) {
  const [data, setData] = useState<AdvancedAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/analytics/clinic/advanced?clinicId=${clinicId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setData(j.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [clinicId])

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading advanced analytics…</div>
  if (!data) return <div className="py-12 text-center text-muted-foreground">No analytics data yet</div>

  const o = data.overview

  return (
    <div className="space-y-8 page-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advanced Analytics</h1>
        <p className="text-sm text-muted-foreground">Revenue forecasting, patient churn, doctor benchmarks, service mix, repeat-patient loyalty</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <TrendStatCard icon={CalendarDays} label="Total Appointments" value={o.totalAppointments} trend={5} />
        <TrendStatCard icon={DollarSign} label="Revenue" value={`PKR ${o.totalRevenue.toLocaleString()}`} trend={12} />
        <TrendStatCard icon={AlertTriangle} label="No-Show Rate" value={`${o.noShowRate.toFixed(1)}%`} trend={-3} />
        <TrendStatCard icon={Users} label="Active Patients" value={o.activePatients} trend={8} />
        <TrendStatCard icon={Activity} label="Churn Rate" value={`${o.churnRate.toFixed(1)}%`} trend={-2} sub="Last 30 days" />
        <TrendStatCard icon={Star} label="Avg Rating" value={o.avgRating.toFixed(1)} trend={0.2} sub="Out of 5" />
        <TrendStatCard icon={Clock} label="Avg Wait Time" value={`${o.avgWaitMins} min`} trend={-5} sub="Down from last month" />
        <TrendStatCard icon={Repeat} label="Repeat-Patient Rate" value={`${data.repeatPatientRate.toFixed(1)}%`} sub={`${data.avgVisitsPerPatient} visits/patient`} />
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Forecast</TabsTrigger>
          <TabsTrigger value="doctors">Doctor Benchmarks</TabsTrigger>
          <TabsTrigger value="hours">Peak Hours</TabsTrigger>
          <TabsTrigger value="patients">Patient Cohorts</TabsTrigger>
          <TabsTrigger value="services">Service Mix</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Forecast</CardTitle>
              <CardDescription>Actual vs predicted revenue (12 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ actual: { label: 'Actual', color: 'var(--chart-2)' }, forecast: { label: 'Forecast', color: 'var(--chart-3)' } }}
                className="h-[300px] w-full"
              >
                <LineChart data={data.revenueForecast} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `PKR ${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="forecast" stroke="var(--color-forecast)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Doctor Performance Benchmarks</CardTitle>
              <CardDescription>Rating, completion rate, no-show rate by doctor</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={doctorConfig} className="h-[300px] w-full">
                <BarChart data={data.doctorBenchmarks} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="doctorName" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(n) => (n.length > 10 ? n.slice(0, 10) + '…' : n)} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="Rating" fill="var(--color-Rating)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completion" fill="var(--color-Completion)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="NoShow" fill="var(--color-NoShow)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-3 mt-4 grid-cols-1 lg:grid-cols-2">
            {data.doctorBenchmarks.slice(0, 4).map((doc) => (
              <Card key={doc.doctorId}>
                <CardContent className="p-4">
                  <div className="font-semibold">{doc.doctorName}</div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                    <div>Rating: <span className="font-medium text-foreground">{doc.avgRating.toFixed(1)}/5</span></div>
                    <div>Completion: <span className="font-medium text-foreground">{doc.completionRate.toFixed(0)}%</span></div>
                    <div>No-shows: <span className="font-medium text-foreground">{doc.noShowRate.toFixed(0)}%</span></div>
                    <div>Patients: <span className="font-medium text-foreground">{doc.totalPatients}</span></div>
                    <div>Wait: <span className="font-medium text-foreground">{doc.avgWaitMins} min</span></div>
                    <div>Rev/pat: <span className="font-medium text-foreground">PKR {doc.revenuePerPatient}</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peak Hours Analysis</CardTitle>
              <CardDescription>Optimal staffing hours based on appointment volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ Appointments: { label: 'Appointments', color: 'var(--chart-3)' }, Revenue: { label: 'Revenue (PKR)', color: 'var(--chart-2)' } }}
                className="h-[300px] w-full"
              >
                <BarChart data={data.peakHours.map((h) => ({ hour: `${h.hour}:00`, Appointments: h.count, Revenue: h.revenue }))} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} width={32} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `PKR ${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="Appointments" fill="var(--color-Appointments)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="Revenue" fill="var(--color-Revenue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-3 mt-4 grid-cols-2 lg:grid-cols-4">
            {data.peakHours.slice(0, 4).map((h) => (
              <Card key={h.hour}>
                <CardContent className="p-3 text-center">
                  <div className="text-sm font-bold">{h.hour}:00</div>
                  <div className="text-xs text-muted-foreground">{h.count} appointments</div>
                  <div className="text-xs text-muted-foreground">PKR {h.revenue.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Patient Cohort Analysis</CardTitle>
              <CardDescription>New vs returning patients and churn over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={cohortConfig} className="h-[300px] w-full">
                <BarChart data={data.patientCohorts} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="New" stackId="a" fill="var(--color-New)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Returning" stackId="a" fill="var(--color-Returning)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Churned" stackId="a" fill="var(--color-Churned)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="size-4 text-chart-1" />
                  Service Mix
                </CardTitle>
                <CardDescription>Bookings and revenue by service (last 90 days)</CardDescription>
              </CardHeader>
              <CardContent>
                {data.serviceMix.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No service-linked appointments yet.</p>
                ) : (
                  <ChartContainer
                    config={{ count: { label: 'Bookings', color: 'var(--chart-1)' }, revenue: { label: 'Revenue (PKR)', color: 'var(--chart-2)' } }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={data.serviceMix} accessibilityLayer>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="service" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(n) => (n.length > 12 ? n.slice(0, 12) + '…' : n)} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} width={32} />
                      <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `PKR ${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Services by Bookings</CardTitle>
                <CardDescription>Share of total service-linked appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {data.serviceMix.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No service-linked appointments yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.serviceMix.slice(0, 6).map((s, i) => {
                      const total = data.serviceMix.reduce((a, b) => a + b.count, 0) || 1
                      const pct = Math.round((s.count / total) * 100)
                      return (
                        <div key={s.service} className="flex items-center gap-3">
                          <span className="size-3 rounded-[3px] shrink-0" style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium truncate">{s.service}</span>
                              <span className="text-muted-foreground tabular-nums">{pct}%</span>
                            </div>
                            <Progress value={pct} className="mt-1 h-1.5" />
                            <div className="text-xs text-muted-foreground mt-1">
                              {s.count} bookings · PKR {s.revenue.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Appointment Type Mix</CardTitle>
              <CardDescription>Consultation vs operation vs follow-up (last 90 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ value: { label: 'Appointments', color: 'var(--chart-2)' } }}
                className="mx-auto aspect-square max-h-[260px]"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                  <Pie
                    data={data.appointmentTypeMix.map((t, i) => ({ name: t.type, value: t.count, fill: MIX_COLORS[i % MIX_COLORS.length] }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {data.appointmentTypeMix.map((_, i) => (
                      <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-3" />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TrendStatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  trend?: number
}) {
  return (
    <Card className="card-stat">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="stat-icon">
            <Icon className="w-[18px] h-[18px]" />
          </div>
          {trend !== undefined && (
            <span className={`text-xs flex items-center gap-0.5 ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
              {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
        <div className="mt-3 text-2xl font-bold tabular-nums gradient-number">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  )
}
