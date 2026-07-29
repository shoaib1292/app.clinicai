'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, Users, CalendarDays, MessageSquare, DollarSign, AlertCircle } from 'lucide-react'

const COLORS = ['#37DCF2', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']

interface Data {
  overview: {
    clinics: number; activeClinics: number; trialClinics: number;
    appointments: number; completedAppts: number; noShowAppts: number; cancelledAppts: number; bookedAppts: number;
    conversations: number; paymentProofs: number;
    totalPlatformFee: number; totalRevenue: number; llmCostUsd: number;
  }
  noShowRate: number
  channelSplit: { channel: string; _count: number }[]
  paymentModeSplit: { paymentMode: string; _count: number }[]
  daily: { date: string; count: number; revenue: number }[]
}

export function PlatformAnalyticsClient() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/platform').then((r) => r.json()).then((j) => {
      if (j.ok) setData(j.data)
      setLoading(false)
    })
  }, [])

  if (loading || !data) return <div className="py-12 text-center text-muted-foreground">Loading analytics...</div>

  const o = data.overview

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground">MRR, active clinics, appointments/day, LLM cost, churn, payment-proof turnaround</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active Clinics" value={o.activeClinics} sub={`${o.trialClinics} on trial`} color="text-brand" />
        <StatCard icon={CalendarDays} label="Appointments" value={o.appointments.toLocaleString()} sub={`${o.completedAppts} completed`} color="text-chart-2" />
        <StatCard icon={DollarSign} label="Platform Fee Earned" value={`PKR ${o.totalPlatformFee.toLocaleString()}`} sub={`LLM cost: $${o.llmCostUsd.toFixed(2)}`} color="text-chart-3" />
        <StatCard icon={AlertCircle} label="No-Show Rate" value={`${data.noShowRate.toFixed(1)}%`} sub={`${o.noShowAppts} no-shows`} color="text-destructive" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Appointments & Revenue (14 days)</CardTitle><CardDescription>Daily volume and completed-appointment revenue</CardDescription></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Channel Split</CardTitle><CardDescription>Where bookings originate</CardDescription></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Payment Mode Split</CardTitle><CardDescription>Cash vs Online (screenshot-verified)</CardDescription></CardHeader>
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

        <Card>
          <CardHeader><CardTitle className="text-base">Appointment Status Breakdown</CardTitle><CardDescription>Distribution by status</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: 'Completed', value: o.completedAppts },
                { name: 'Booked', value: o.bookedAppts },
                { name: 'No-show', value: o.noShowAppts },
                { name: 'Cancelled', value: o.cancelledAppts },
              ]}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" fill="#37DCF2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
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
