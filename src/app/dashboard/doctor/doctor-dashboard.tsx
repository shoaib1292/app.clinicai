'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardShell, doctorNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarDays, CheckCircle2, XCircle, Clock, Users, Activity, Stethoscope, LogIn, LogOut, Coffee, Car, Hash, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/animated-counter'
import { MetricCard } from '@/components/analytics/stat-card'
import { useRealtime } from '@/hooks/use-realtime'
import type { SessionPayload } from '@/lib/auth'

interface DoctorData {
  id: string
  name: string
  speciality: string
  currentStatus: string
  queueMode: string
  gender: string
  slotDurationMin: number
  services: Array<{ id: string; name: string }>
}

interface TodayAppt {
  id: string
  start: Date
  end: Date
  status: string
  paymentStatus: string
  paymentMode: string
  totalFee: number
  checkInTime: Date | null
  patient: { id: string; name: string | null; phone: string; gender: string }
  service: { id: string; name: string } | null
  slot: { tokenNo: number | null } | null
}

interface Props {
  session: SessionPayload
  clinicName: string
  doctor: DoctorData
  todayAppts: TodayAppt[]
  stats: { todayTotal: number; completed: number; noShows: number; upcoming: number }
  currentToken: number
}

const STATUS_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  in_clinic: { label: 'In Clinic', icon: LogIn, color: 'text-chart-2', variant: 'default' },
  break: { label: 'On Break', icon: Coffee, color: 'text-chart-3', variant: 'secondary' },
  off: { label: 'Off Duty', icon: LogOut, color: 'text-muted-foreground', variant: 'outline' },
  on_way: { label: 'On the Way', icon: Car, color: 'text-chart-4', variant: 'secondary' },
}

export function DoctorDashboard({ session, clinicName, doctor, todayAppts, stats, currentToken }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(doctor.currentStatus)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Realtime: refresh when a queue event arrives (subscribes to clinic queue channel).
  // The doctor-specific channel would be a future enhancement; for now the clinic-wide
  // queue channel covers slot_booked / patient_checked_in / doctor_status_changed events.
  const { connected, lastEvent } = useRealtime(session.clinicId ? `clinic:${session.clinicId}:queue` : null)
  useEffect(() => {
    if (!lastEvent?.message) return
    const type = (lastEvent.message as { type?: string }).type
    if (type === 'patient_checked_in' || type === 'slot_booked' || type === 'doctor_status_changed') {
      router.refresh()
      if (type === 'patient_checked_in') {
        toast.info('Patient checked in', { description: 'Queue updated' })
      }
    }
  }, [lastEvent, router])

  async function changeStatus(newStatus: string) {
    setBusyId('status-' + newStatus)
    const res = await fetch(`/api/doctors/${doctor.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) {
      toast.error(json.error || 'Failed to update status')
      return
    }
    setStatus(newStatus)
    toast.success(`Status changed to ${STATUS_META[newStatus]?.label || newStatus}`)
  }

  async function checkIn(apptId: string) {
    setBusyId(apptId + '-checkin')
    const res = await fetch(`/api/appointments/${apptId}/checkin`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) {
      toast.error(json.error || 'Check-in failed')
      return
    }
    toast.success(`Patient checked in (${json.data.status}${json.data.lateBy ? `, ${json.data.lateBy}m late` : ''})`)
    router.refresh()
  }

  async function markNoShow(apptId: string) {
    setBusyId(apptId + '-noshow')
    const res = await fetch(`/api/appointments/${apptId}/no-show`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) {
      toast.error(json.error || 'Failed to mark no-show')
      return
    }
    toast.success('Marked as no-show' + (json.data.requiresPrepayment ? ' (requires prepayment)' : ''))
    router.refresh()
  }

  const statusMeta = STATUS_META[status] || STATUS_META.off
  const StatusIcon = statusMeta.icon

  return (
    <DashboardShell userType="doctor" userName={session.name} clinicName={clinicName} navItems={doctorNav}>
      <div className="space-y-6">
        {/* Doctor header + status card */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{doctor.name}</h1>
            <p className="text-muted-foreground">{doctor.speciality} · {clinicName}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={connected ? 'default' : 'outline'} className="gap-1.5 text-xs">
                <Wifi className={`w-3 h-3 ${connected ? 'text-brand-foreground' : 'text-muted-foreground'}`} />
                {connected ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-foreground opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-foreground" />
                    </span>
                    Live
                  </>
                ) : (
                  <>Offline</>
                )}
              </Badge>
            </div>
          </div>
          <Card className="min-w-[300px] glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Current Status</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusIcon className={`w-4 h-4 ${statusMeta.color}`} />
                    <span className="font-semibold">{statusMeta.label}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Current Token</div>
                  <div className="flex items-center gap-1 text-2xl font-bold text-brand">
                    <Hash className="w-4 h-4" />{currentToken || '—'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['in_clinic', 'break', 'on_way', 'off'] as const).map((s) => {
                  const Icon = STATUS_META[s].icon
                  const active = status === s
                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className={`h-auto py-2 flex flex-col items-center gap-0.5 ${active ? 'brand-gradient' : 'hover:border-brand/40'}`}
                      onClick={() => changeStatus(s)}
                      disabled={busyId === 'status-' + s}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{STATUS_META[s].label}</span>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={CalendarDays} label="Today's Appointments" value={stats.todayTotal} />
          <MetricCard icon={CheckCircle2} label="Completed" value={stats.completed} />
          <MetricCard icon={XCircle} label="No-Shows" value={stats.noShows} />
          <MetricCard icon={Clock} label="Upcoming" value={stats.upcoming} />
        </div>

        {/* Live queue */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand" />
                  </span>
                  Live Queue
                </CardTitle>
                <CardDescription>{new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })} · ordered by start time</CardDescription>
              </div>
              {connected && <Badge variant="outline" className="text-xs gap-1"><Wifi className="w-3 h-3 text-brand" />real-time</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Token</TableHead>
                    <TableHead className="w-24">Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppts.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No appointments today.</TableCell></TableRow>
                  )}
                  {todayAppts.map((a) => {
                    const isActive = a.status === 'booked' || a.status === 'confirmed'
                    return (
                      <TableRow key={a.id} className="hover:bg-accent/40 transition-colors">
                        <TableCell>
                          {a.slot?.tokenNo ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-soft text-brand text-xs font-bold">
                              {a.slot.tokenNo}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(a.start).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.patient.name || a.patient.phone}</div>
                          <div className="text-xs text-muted-foreground">{a.patient.phone}</div>
                        </TableCell>
                        <TableCell className="text-sm">{a.service?.name || doctor.speciality}</TableCell>
                        <TableCell className="text-right text-sm">PKR {a.totalFee}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={apptBadgeVariant(a.status)} className="text-xs capitalize">{a.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="default" className="h-7" onClick={() => checkIn(a.id)} disabled={busyId === a.id + '-checkin'}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />Check-in
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-destructive hover:text-destructive" onClick={() => markNoShow(a.id)} disabled={busyId === a.id + '-noshow'}>
                                <XCircle className="w-3 h-3 mr-1" />No-show
                              </Button>
                            </div>
                          )}
                          {a.checkInTime && <div className="text-xs text-muted-foreground">In: {new Date(a.checkInTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Doctor meta */}
        <Card>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-3 text-sm">
            <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-brand" />{doctor.speciality}</div>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-brand" />Queue: <span className="capitalize">{doctor.queueMode}</span></div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-brand" />{doctor.services.length} service{doctor.services.length !== 1 ? 's' : ''}</div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

function apptBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'no_show' || status === 'cancelled' || status === 'invalid' || status === 'late_no_show') return 'destructive'
  if (status === 'booked' || status === 'confirmed') return 'secondary'
  return 'outline'
}

