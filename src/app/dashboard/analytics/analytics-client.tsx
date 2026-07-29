'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { CalendarDays, CheckCircle2, XCircle, MessageSquare, Wallet, Users, Activity, Bot, Clock, TrendingUp } from 'lucide-react'

const COLORS = ['#37DCF2', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']

interface Data {
  overview: {
    appointments: number
    completedAppts: number
    noShowAppts: number
    cancelledAppts: number
    bookedAppts: number
    conversations: number
    activeConvos: number
    paymentProofs: number
    doctors: number
    llmCalls: number
    creditBalance: number
    totalRevenue: number
    totalDoctorFee: number
    totalExtraClinicFee: number
    totalPlatformFee: number
    totalTopups: number
  }
  noShowRate: number
  deflectionRate: number
  channelSplit: { channel: string; _count: number }[]
  paymentModeSplit: { paymentMode: string; _count: number }[]
  daily: { date: string; count: number; revenue: number }[]
  peakHours: { hour: number; count: number }[]
  doctorUtilisation: { doctorId: string; name: string; total: number; completed: number; utilisation: number }[]
}

export function AnalyticsClient() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/clinic').then((r) => r.json()).then((j) => {
      if (j.ok) setData(j.data)
      setLoading(false)
    })
  }, [])

  if (loading || !data) return <div className="py-12 text-center text-muted-foreground">Loading analytics…</div>

  const o = data.overview

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clinic Analytics</h1>
        <p className="text-muted-foreground">Appointments, no-show rate, peak hours, doctor utilisation, revenue, AI deflection</p>
      </div>

      {/* Overview stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Appointments" value={o.appointments} sub={`${o.completedAppts} completed`} color="text-brand" />
        <StatCard icon={XCircle} label="No-Show Rate" value={`${data.noShowRate.toFixed(1)}%`} sub={`${o.noShowAppts} no-shows`} color="text-destructive" />
        <StatCard icon={Wallet} label="Revenue (PKR)" value={o.totalRevenue.toLocaleString()} sub={`PKR ${o.creditBalance.toLocaleString()} balance`} color="text-chart-2" />
        <StatCard icon={Bot} label="AI Deflection" value={`${data.deflectionRate.toFixed(0)}%`} sub={`${o.activeConvos} active convos`} color="text-chart-3" />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments & Revenue (14 days)</CardTitle>
            <CardDescription>Daily volume and completed-appointment revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#37DCF2" name="Appointments" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#22C55E" name="Revenue (PKR)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Hours</CardTitle>
            <CardDescription>When patients book — by hour of day (last 14 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.peakHours.map((p) => ({ ...p, label: `${p.hour}:00` }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#37DCF2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Split</CardTitle>
            <CardDescription>Where bookings originate</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.channelSplit.map((c) => ({ name: c.channel, value: c._count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {data.channelSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Mode Split</CardTitle>
            <CardDescription>Cash vs Online (screenshot-verified)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.paymentModeSplit.map((c) => ({ name: c.paymentMode, value: c._count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {data.paymentModeSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Doctor utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doctor Utilisation (14 days)</CardTitle>
          <CardDescription>Completion rate per doctor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.doctorUtilisation.map((d) => (
              <div key={d.doctorId} className="p-3 rounded-md border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.name}</div>
                  <Badge variant="outline" className="text-xs">{d.total} appts</Badge>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full brand-gradient" style={{ width: `${Math.min(100, d.utilisation)}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{d.completed} completed</span>
                  <span className="font-medium text-brand">{d.utilisation.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Breakdown</CardTitle>
          <CardDescription>From {o.completedAppts} completed appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-md bg-muted/40">
              <TrendingUp className="w-4 h-4 text-chart-2" />
              <div className="mt-2 text-xl font-bold">PKR {o.totalDoctorFee.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Doctor fees (kept by clinic)</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <Wallet className="w-4 h-4 text-chart-3" />
              <div className="mt-2 text-xl font-bold">PKR {o.totalExtraClinicFee.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Extra clinic fees</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <Activity className="w-4 h-4 text-chart-4" />
              <div className="mt-2 text-xl font-bold">PKR {o.totalPlatformFee.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Platform fees (debited)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  )
}
