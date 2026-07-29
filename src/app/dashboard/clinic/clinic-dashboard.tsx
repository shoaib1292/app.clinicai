'use client'

import Link from 'next/link'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CalendarDays, Users, MessageSquare, Wallet, Bot, Stethoscope, Phone, Activity, ArrowRight, Clock, AlertCircle, TrendingUp, CheckCircle2, XCircle, Banknote, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/animated-counter'
import { MetricCard } from '@/components/analytics/stat-card'
import { MiniBarChart } from '@/components/mini-bar-chart'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
  clinic: {
    id: string; name: string; slug: string; city: string | null;
    status: string; agentEnabled: boolean; agentName: string; agentGender: string;
    agentTone: string; agentLanguages: string; agentWelcome: string;
    creditBalance: number; settlementMode: string; onlinePaymentsEnabled: boolean;
    evolutionConnected: boolean; metaConnected: boolean;
    doctors: Array<{ id: string; name: string; gender: string; speciality: string; currentStatus: string; _count: { appointments: number } }>;
    receptionists: Array<{ id: string; name: string; email: string }>;
    bankAccounts: Array<{ id: string; bankName: string; isDefault: boolean }>;
    _count: { appointments: number; patients: number; conversations: number };
  }
  todayAppts: Array<{
    id: string; start: Date; status: string; totalFee: number; paymentMode: string;
    patient: { name: string | null; phone: string }; doctor: { name: string; speciality: string }; service: { name: string } | null
  }>
  activeConvos: number
  pendingPayments: number
  recentConvos: Array<{
    id: string; status: string; lastIntent: string | null; updatedAt: Date;
    patient: { name: string | null; phone: string }; _count: { messages: number }
  }>
  todaySummary: {
    completed: number
    noShow: number
    cancelled: number
    booked: number
    revenue: number
    totalToday: number
  }
  weekChart: Array<{ label: string; value: number; highlight: boolean }>
  feedbackSummary: {
    avgRating: number | null
    totalReviews: number
  }
}

export function ClinicDashboard({ session, clinic, todayAppts, activeConvos, pendingPayments, recentConvos, todaySummary, weekChart, feedbackSummary }: Props) {
  const [agentEnabled, setAgentEnabled] = useState(clinic.agentEnabled)

  async function toggleAgent() {
    const newVal = !agentEnabled
    setAgentEnabled(newVal)
    const res = await fetch(`/api/clinics/${clinic.id}/toggle-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newVal, reason: 'Toggled from clinic dashboard' }),
    })
    const json = await res.json()
    if (!json.ok) {
      toast.error(json.error || 'Failed to toggle agent')
      setAgentEnabled(!newVal)
      return
    }
    toast.success(`AI agent ${newVal ? 'enabled' : 'paused'}`)
  }

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{clinic.name}</h1>
            <p className="text-muted-foreground">{clinic.city} · <Badge variant="outline" className="capitalize">{clinic.status}</Badge></p>
          </div>
          <Card className="min-w-[280px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">AI Agent</div>
                  <div className="font-medium">{clinic.agentName} ({clinic.agentGender})</div>
                  <div className="text-xs text-muted-foreground capitalize">{clinic.agentTone} tone</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Switch checked={agentEnabled} onCheckedChange={toggleAgent} />
                  <span className="text-xs text-muted-foreground">{agentEnabled ? 'On' : 'Paused'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stat cards — clean shadcn style */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={CalendarDays} label="Today's Appointments" value={todaySummary.totalToday} color="text-primary" sub={todaySummary.completed > 0 ? `${todaySummary.completed} done` : undefined} />
          <MetricCard icon={Users} label="Total Patients" value={clinic._count.patients} color="text-secondary-foreground" sub={`+${clinic._count.patients > 0 ? Math.round(clinic._count.patients * 0.08) : 0} this wk`} />
          <MetricCard icon={MessageSquare} label="Active Chats" value={activeConvos} color="text-secondary-foreground" sub={activeConvos > 0 ? 'live now' : undefined} pulse={activeConvos > 0} />
          <MetricCard icon={Wallet} label="Credit Balance" value={clinic.creditBalance} color={clinic.creditBalance < 1000 ? 'text-destructive' : 'text-secondary-foreground'} prefix="PKR " sub={clinic.creditBalance < 1000 ? 'low' : 'healthy'} />
        </div>

        {/* Today's Summary widget + 7-day revenue chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Today's Summary
                  </CardTitle>
                  <CardDescription>{new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">Live</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiPill icon={CheckCircle2} label="Completed" value={todaySummary.completed} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" />
                <KpiPill icon={CalendarDays} label="Booked" value={todaySummary.booked} color="text-primary" bg="bg-primary/10" />
                <KpiPill icon={XCircle} label="No-shows" value={todaySummary.noShow} color="text-rose-600 dark:text-rose-400" bg="bg-rose-500/10" />
                <KpiPill icon={Banknote} label="Revenue" value={todaySummary.revenue} color="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" prefix="PKR " />
              </div>

              {/* 7-day revenue chart */}
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">7-Day Revenue</div>
                    <div className="text-lg font-bold">
                      PKR <AnimatedCounter value={weekChart.reduce((s, d) => s + d.value, 0)} />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>Today: PKR {weekChart[6]?.value ?? 0}</div>
                    <div className="text-primary">● highlighted</div>
                  </div>
                </div>
                <MiniBarChart data={weekChart} height={84} valuePrefix="PKR " />
              </div>

              {/* Quick links */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" asChild><Link href="/dashboard/appointments"><CalendarDays className="w-3 h-3 mr-1" />All appointments</Link></Button>
                <Button size="sm" variant="outline" asChild><Link href="/dashboard/analytics"><Activity className="w-3 h-3 mr-1" />Deep analytics</Link></Button>
                <Button size="sm" variant="outline" asChild><Link href="/dashboard/billing"><Wallet className="w-3 h-3 mr-1" />Wallet</Link></Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent conversations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Chats</CardTitle>
                <CardDescription>WhatsApp conversations</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild><Link href="/dashboard/conversations">All <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                {recentConvos.length === 0 && <div className="text-center py-8 text-muted-foreground">No conversations yet.</div>}
                {recentConvos.map((c) => (
                  <Link key={c.id} href={`/dashboard/conversations/${c.id}`} className="block p-3 rounded-md border hover:bg-accent/40 hover:border-primary/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{c.patient.name || c.patient.phone}</span>
                      <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="w-3 h-3" />{new Date(c.updatedAt).toLocaleString('en-PK', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      <MessageSquare className="w-3 h-3 ml-1" />{c._count.messages}
                      {c.lastIntent && <Badge variant="outline" className="text-xs">{c.lastIntent}</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's appointments + Doctors grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Today's Schedule</CardTitle>
              <CardDescription>{todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''} today</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/appointments">View all <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto scroll-thin space-y-2">
              {todayAppts.length === 0 && <div className="text-center py-8 text-muted-foreground">No appointments today.</div>}
              {todayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent/40 hover:border-primary/30 transition-all">
                  <div className="w-12 text-center">
                    <div className="text-sm font-semibold">{new Date(a.start).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.patient.name || a.patient.phone}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.doctor.name} · {a.service?.name || a.doctor.speciality}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={a.status === 'completed' ? 'default' : a.status === 'cancelled' || a.status === 'no_show' ? 'destructive' : 'secondary'} className="text-xs capitalize">{a.status.replace('_', ' ')}</Badge>
                    <div className="text-xs text-muted-foreground mt-0.5">PKR {a.totalFee}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Doctors grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-base">Doctors</CardTitle><CardDescription>{clinic.doctors.length} doctors</CardDescription></div>
            <Button variant="ghost" size="sm" asChild><Link href="/dashboard/clinic/doctors">Manage <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clinic.doctors.map((d) => (
                <Link key={d.id} href={`/dashboard/clinic/doctors/${d.id}`} className="block p-3 rounded-md border hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${d.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>{d.name.charAt(4) || 'D'}</div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.speciality}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={d.currentStatus === 'in_clinic' ? 'default' : d.currentStatus === 'break' ? 'secondary' : 'outline'} className="text-xs capitalize">{d.currentStatus.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">{d._count.appointments} appts</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feedback mini-widget + Quick actions */}
        <div className="grid gap-4 lg:grid-cols-3">
          {feedbackSummary.avgRating !== null && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Patient Rating</div>
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold gradient-number">{feedbackSummary.avgRating}</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 star-anim ${i < Math.round(feedbackSummary.avgRating!) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} style={{ animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{feedbackSummary.totalReviews} review{feedbackSummary.totalReviews !== 1 ? 's' : ''}</div>
                <Button size="sm" variant="ghost" asChild className="mt-2 h-7 text-xs">
                  <Link href="/dashboard/clinic/feedback">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          )}

        {/* Quick actions */}
        <div className={`grid gap-3 sm:grid-cols-2 ${feedbackSummary.avgRating !== null ? 'lg:col-span-2' : 'lg:col-span-3'} grid-cols-2`}>
          <Button variant="outline" asChild className="h-auto py-4 justify-start hover:border-primary/40"><Link href="/dashboard/agent-chat"><Bot className="w-4 h-4 mr-2" />Test AI Agent</Link></Button>
          <Button variant="outline" asChild className="h-auto py-4 justify-start hover:border-primary/40"><Link href="/dashboard/clinic/doctors"><Stethoscope className="w-4 h-4 mr-2" />Add Doctor</Link></Button>
          <Button variant="outline" asChild className="h-auto py-4 justify-start hover:border-primary/40"><Link href="/dashboard/clinic/bank-accounts"><Wallet className="w-4 h-4 mr-2" />Bank Accounts</Link></Button>
          <Button variant="outline" asChild className="h-auto py-4 justify-start hover:border-primary/40"><Link href="/dashboard/billing"><TrendingUp className="w-4 h-4 mr-2" />Billing & Wallet</Link></Button>
        </div>
        </div>

        {pendingPayments > 0 && (
          <Card className="border-brand bg-brand/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="relative">
                <AlertCircle className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand animate-ping" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{pendingPayments} payment proof{pendingPayments !== 1 ? 's' : ''} pending confirmation</div>
                <div className="text-xs text-muted-foreground">Patients/clinic have uploaded screenshots that need verification.</div>
              </div>
              <Button size="sm" asChild><Link href="/dashboard/payments">Review</Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}

function KpiPill({ icon: Icon, label, value, color, bg, prefix = '' }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string; bg: string; prefix?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${bg}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>
        {prefix}<AnimatedCounter value={value} />
      </div>
    </div>
  )
}
