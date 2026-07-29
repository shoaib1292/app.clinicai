'use client'

import { DashboardShell, platformAdminNav, type NavItem } from '@/components/dashboard-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, CalendarDays, KeyRound, Activity, Wallet, MessageSquare, TrendingUp, ArrowRight, Phone, Sparkles, UserRound } from 'lucide-react'
import Link from 'next/link'
import { MetricCard } from '@/components/analytics/stat-card'
import type { SessionPayload } from '@/lib/auth'

interface Props {
  session: SessionPayload
  stats: {
    clinics: number
    staff: number
    appointments: number
    llmKeys: number
    leads: number
    pendingProofs: number
    conversations: number
    totalRevenue: number
  }
  recentClinics: Array<{
    id: string; name: string; slug: string; city: string | null
    status: string; creditBalance: number; agentEnabled: boolean
    _count: { appointments: number }
  }>
  recentLeads: Array<{
    id: string; clinicName: string; adminName: string; whatsappNumber: string
    city: string; status: string; createdAt: Date
    claimedBy: { name: string } | null
  }>
}

export function PlatformDashboard({ session, stats, recentClinics, recentLeads }: Props) {
  const nav: NavItem[] = platformAdminNav.map((n) => {
    if (n.label === 'Leads') return { ...n, badge: String(stats.leads) }
    if (n.label === 'Audit Log') return n
    return n
  })

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={nav}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {session.name}</h1>
            <p className="text-muted-foreground">Platform overview · {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            All systems operational
          </Badge>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Building2} label="Active Clinics" value={stats.clinics} />
          <MetricCard icon={CalendarDays} label="Total Appointments" value={stats.appointments} />
          <MetricCard icon={Wallet} label="Platform Fee (PKR)" value={stats.totalRevenue} />
          <MetricCard icon={Activity} label="New Leads" value={stats.leads} />
          <MetricCard icon={TrendingUp} label="Pending Proofs" value={stats.pendingProofs} />
          <MetricCard icon={MessageSquare} label="Active Chats" value={stats.conversations} pulse={stats.conversations > 0} />
          <MetricCard icon={UserRound} label="Platform Staff" value={stats.staff} />
          <MetricCard icon={KeyRound} label="Active LLM Keys" value={stats.llmKeys} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4" />Recent Clinics</CardTitle>
                <CardDescription>Latest onboarded clinics</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/platform/clinics">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentClinics.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No clinics yet.</p>}
              {recentClinics.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/40 transition-all">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.city} · {c._count.appointments} appointments</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={c.agentEnabled ? 'default' : 'secondary'} className="text-xs">
                      {c.agentEnabled ? 'Agent On' : 'Agent Off'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">PKR {c.creditBalance.toLocaleString()}</Badge>
                    <Badge variant={c.status === 'active' ? 'default' : c.status === 'trial' ? 'secondary' : 'destructive'} className="text-xs capitalize">{c.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>New Leads</CardTitle>
                <CardDescription>From landing page form</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/platform/leads">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentLeads.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No leads yet.</p>}
              {recentLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-md border">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{l.clinicName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {l.whatsappNumber} · {l.city}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs capitalize">{l.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common platform admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" asChild className="h-auto py-3 justify-start">
              <Link href="/dashboard/platform/llm-keys"><KeyRound className="w-4 h-4 mr-2" /> Add LLM Key</Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 justify-start">
              <Link href="/dashboard/platform/pricing"><Wallet className="w-4 h-4 mr-2" /> Configure Pricing</Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 justify-start">
              <Link href="/dashboard/platform/staff"><UserRound className="w-4 h-4 mr-2" /> Manage Staff</Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-3 justify-start">
              <Link href="/dashboard/platform/calendar"><CalendarDays className="w-4 h-4 mr-2" /> Platform Calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
