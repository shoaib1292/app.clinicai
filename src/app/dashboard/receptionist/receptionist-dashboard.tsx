'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardShell, receptionistNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, Plus, Loader2, Stethoscope, Users, Hash, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/animated-counter'
import { MetricCard } from '@/components/analytics/stat-card'
import { useRealtime } from '@/hooks/use-realtime'
import type { SessionPayload } from '@/lib/auth'

interface Doctor {
  id: string
  name: string
  speciality: string
  currentStatus: string
  queueMode: string
}

interface QueueItem {
  id: string
  start: Date
  status: string
  paymentStatus: string
  paymentMode: string
  totalFee: number
  patient: { id: string; name: string | null; phone: string; gender: string }
  doctor: { id: string; name: string; speciality: string; currentStatus: string; queueMode: string }
  service: { name: string } | null
  slot: { tokenNo: number | null } | null
}

interface Props {
  session: SessionPayload
  clinicName: string
  doctors: Doctor[]
  groupedQueue: Array<{ doctor: Doctor; appts: QueueItem[] }>
  pendingProofs: number
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  booked: 'secondary',
  confirmed: 'secondary',
  no_show: 'destructive',
  cancelled: 'destructive',
  late_no_show: 'destructive',
  invalid: 'destructive',
}

export function ReceptionistDashboard({ session, clinicName, doctors, groupedQueue, pendingProofs }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [walkIn, setWalkIn] = useState({
    doctorId: '',
    patientName: '',
    patientPhone: '',
    paymentMode: 'cash',
  })
  const [submitting, setSubmitting] = useState(false)

  // Realtime: subscribe to clinic queue + ops channels for live updates
  const clinicId = session.clinicId
  const { connected: queueConnected, lastEvent: queueEvent } = useRealtime(clinicId ? `clinic:${clinicId}:queue` : null)
  const { lastEvent: opsEvent } = useRealtime(clinicId ? `clinic:${clinicId}:ops` : null)

  // Auto-refresh when a realtime event arrives
  useEffect(() => {
    if (queueEvent || opsEvent) {
      const msg = (queueEvent?.message || opsEvent?.message) as { type?: string } | undefined
      if (msg?.type === 'slot_booked') toast.info('New booking received')
      if (msg?.type === 'patient_checked_in') toast.info('Patient checked in')
      if (msg?.type === 'doctor_status_changed') toast.info('Doctor status changed')
      router.refresh()
    }
  }, [queueEvent, opsEvent, router])

  const totalToday = groupedQueue.reduce((acc, g) => acc + g.appts.length, 0)
  const totalCompleted = groupedQueue.reduce((acc, g) => acc + g.appts.filter((a) => a.status === 'completed').length, 0)
  const totalActive = groupedQueue.reduce((acc, g) => acc + g.appts.filter((a) => a.status === 'booked' || a.status === 'confirmed').length, 0)

  async function checkIn(apptId: string) {
    setBusyId(apptId + '-checkin')
    const res = await fetch(`/api/appointments/${apptId}/checkin`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Check-in failed'); return }
    toast.success(`Patient checked in (${json.data.status})`)
    router.refresh()
  }

  async function markNoShow(apptId: string) {
    setBusyId(apptId + '-noshow')
    const res = await fetch(`/api/appointments/${apptId}/no-show`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Marked as no-show')
    router.refresh()
  }

  async function createWalkIn() {
    if (!walkIn.doctorId || !walkIn.patientPhone || !walkIn.patientName) {
      toast.error('Doctor, patient name and phone are required')
      return
    }
    setSubmitting(true)
    // Find the earliest available slot for today
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const slotsRes = await fetch(`/api/slots/available?doctorId=${walkIn.doctorId}&date=${dateStr}`)
    const slotsJson = await slotsRes.json()
    if (!slotsJson.ok || !slotsJson.data.slots?.length) {
      toast.error('No open slots available today for this doctor. Use Book Appointment to pick a future slot.')
      setSubmitting(false)
      return
    }
    const slot = slotsJson.data.slots[0]
    const bookRes = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: walkIn.doctorId,
        slotId: slot.id,
        patientPhone: walkIn.patientPhone,
        patientName: walkIn.patientName,
        channel: 'manual',
        paymentMode: walkIn.paymentMode,
        createdVia: 'receptionist',
      }),
    })
    const bookJson = await bookRes.json()
    setSubmitting(false)
    if (!bookJson.ok) { toast.error(bookJson.error || 'Failed to create walk-in'); return }
    toast.success('Walk-in appointment booked')
    setWalkInOpen(false)
    setWalkIn({ doctorId: '', patientName: '', patientPhone: '', paymentMode: 'cash' })
    router.refresh()
  }

  return (
    <DashboardShell userType="receptionist" userName={session.name} clinicName={clinicName} navItems={receptionistNav}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Live Queue
              <Badge variant={queueConnected ? 'default' : 'secondary'} className="text-xs gap-1">
                {queueConnected ? <><Wifi className="w-3 h-3 live-dot" /> Live</> : <><WifiOff className="w-3 h-3" /> Offline</>}
              </Badge>
            </h1>
            <p className="text-muted-foreground">{clinicName} · {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link href="/dashboard/receptionist/book"><Plus className="w-4 h-4 mr-1" />Book Appointment</Link></Button>
            <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
              <DialogTrigger asChild><Button><Users className="w-4 h-4 mr-1" />Walk-in</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Walk-in Appointment</DialogTitle>
                  <DialogDescription>Book the next available slot for today for the selected doctor.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>Doctor</Label>
                    <Select value={walkIn.doctorId} onValueChange={(v) => setWalkIn({ ...walkIn, doctorId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                      <SelectContent>
                        {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} — {d.speciality}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Patient Name</Label>
                      <Input value={walkIn.patientName} onChange={(e) => setWalkIn({ ...walkIn, patientName: e.target.value })} placeholder="e.g. Bilal Khan" />
                    </div>
                    <div className="space-y-2">
                      <Label>Patient Phone</Label>
                      <Input value={walkIn.patientPhone} onChange={(e) => setWalkIn({ ...walkIn, patientPhone: e.target.value })} placeholder="+92..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={walkIn.paymentMode} onValueChange={(v) => setWalkIn({ ...walkIn, paymentMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="online">Online (transfer)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWalkInOpen(false)}>Cancel</Button>
                  <Button onClick={createWalkIn} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Book Walk-in
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={CalendarDays} label="Today's Total" value={totalToday} />
          <MetricCard icon={CheckCircle2} label="Completed" value={totalCompleted} />
          <MetricCard icon={Users} label="In Queue" value={totalActive} />
          <MetricCard icon={AlertCircle} label="Pending Proofs" value={pendingProofs} color={pendingProofs > 0 ? 'text-destructive' : 'text-muted-foreground'} />
        </div>

        {pendingProofs > 0 && (
          <Card className="border-brand">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-brand" />
              <div className="flex-1">
                <div className="font-medium">{pendingProofs} payment proof{pendingProofs !== 1 ? 's' : ''} pending confirmation</div>
                <div className="text-xs text-muted-foreground">Review and confirm or reject patient-submitted payment screenshots.</div>
              </div>
              <Button size="sm" asChild><Link href="/dashboard/payments">Review</Link></Button>
            </CardContent>
          </Card>
        )}

        {/* Queue grouped by doctor */}
        {groupedQueue.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No appointments today.</CardContent></Card>
        )}
        {groupedQueue.map((g) => (
          <Card key={g.doctor.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-brand" />
                  <CardTitle className="text-base">{g.doctor.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{g.doctor.speciality}</Badge>
                  <Badge variant={g.doctor.currentStatus === 'in_clinic' ? 'default' : g.doctor.currentStatus === 'break' ? 'secondary' : 'outline'} className="text-xs capitalize">
                    {g.doctor.currentStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription>{g.appts.length} appointment{g.appts.length !== 1 ? 's' : ''}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto scroll-thin">
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
                    {g.appts.map((a) => {
                      const isActive = a.status === 'booked' || a.status === 'confirmed'
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            {a.slot?.tokenNo ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-soft text-brand text-xs font-bold">
                                {a.slot.tokenNo}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{new Date(a.start).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell>
                            <div className="font-medium">{a.patient.name || a.patient.phone}</div>
                            <div className="text-xs text-muted-foreground">{a.patient.phone}</div>
                          </TableCell>
                          <TableCell className="text-sm">{a.service?.name || g.doctor.speciality}</TableCell>
                          <TableCell className="text-right text-sm">PKR {a.totalFee}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={STATUS_VARIANT[a.status] || 'outline'} className="text-xs capitalize">{a.status.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive && (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" className="h-7" onClick={() => checkIn(a.id)} disabled={busyId === a.id + '-checkin'}>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />Check-in
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-destructive hover:text-destructive" onClick={() => markNoShow(a.id)} disabled={busyId === a.id + '-noshow'}>
                                  <XCircle className="w-3 h-3 mr-1" />No-show
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  )
}
