'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, CalendarDays, Clock, Hash, User, Phone, Stethoscope, Wallet, Activity,
  CheckCircle2, XCircle, Ban, RotateCw, Mic, MessageSquare, Bell, FileText,
  CreditCard, MapPin, Users, AlertTriangle, Loader2, History, Sparkles, Send,
  Star, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// Serialized types (dates as ISO strings)
interface Patient {
  id: string; name: string | null; phone: string; phoneLast4: string; gender: string
  preferredLanguage: string; preferredModality: string; noShowCount: number; totalVisits: number
  invalidBookingCount: number; optInMarketing: boolean
  createdAt: string; updatedAt: string
  familyMembers: Array<{ id: string; name: string; gender: string; relation: string }>
}
interface Doctor { id: string; name: string; speciality: string; gender: string; currentStatus: string }
interface Service { name: string; durationMin: number }
interface Fees { baseDoctorFee: number; clinicMarkup: number; platformFee: number; platformFeeOverride: number | null; total: number; currency: string }
interface Slot { id: string; tokenNo: number | null; startTime: string; endTime: string }
interface Reminder {
  id: string; type: string; sendAt: string; status: string; channel: string; error: string | null
  sentAt: string | null; createdAt: string
}
interface PaymentProof {
  id: string; ledgerType: string; amount: number; payerName: string; payerPhone: string | null
  screenshotUrl: string; uploadedBy: string; status: string; confirmedBy: string | null
  confirmedAt: string | null; notes: string | null; createdAt: string; updatedAt: string
}
interface Feedback {
  id: string; rating: number; waitTimeMins: number | null; tags: string
  comment: string | null; channel: string; createdAt: string
}
interface AuditLogEntry {
  id: string; action: string; actorType: string; actorId: string | null
  metadata: string; ts: string
}
interface Appt {
  id: string; clinicId: string; patientId: string; doctorId: string; slotId: string | null
  serviceId: string | null; familyMemberId: string | null
  start: string; end: string; status: string; channel: string
  doctorFee: number; clinicMarkup: number; platformFee: number; totalFee: number
  paymentStatus: string; paymentMode: string; createdByStaffId: string | null
  createdVia: string; metaMsgId: string | null; checkInTime: string | null
  notes: string | null; createdAt: string; updatedAt: string
  patient: Patient
  doctor: Doctor
  service: Service | null
  fees: Fees | null
  slot: Slot | null
  reminders: Reminder[]
  paymentProof: PaymentProof | null
  feedback: Feedback | null
  familyMember: { id: string; name: string; gender: string; relation: string } | null
  auditLogs: AuditLogEntry[]
}

interface Props {
  appt: Appt
  userType: string
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  held: { label: 'Held', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/15', icon: Clock },
  booked: { label: 'Booked', color: 'text-brand', bg: 'bg-brand/15', icon: CalendarDays },
  confirmed: { label: 'Confirmed', color: 'text-brand', bg: 'bg-brand/15', icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/15', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-muted-foreground', bg: 'bg-muted', icon: Ban },
  no_show: { label: 'No-show', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/15', icon: XCircle },
  late_no_show: { label: 'Late No-show', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/15', icon: XCircle },
  invalid: { label: 'Invalid', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/15', icon: AlertTriangle },
}

const CHANNEL_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-chart-2' },
  manual: { label: 'Manual', icon: User, color: 'text-chart-3' },
  link: { label: 'Booking Link', icon: Hash, color: 'text-chart-4' },
  platform: { label: 'Platform', icon: Activity, color: 'text-chart-5' },
}

const REMINDER_LABEL: Record<string, string> = {
  reminder_24h: '24 hours before',
  reminder_2h: '2 hours before',
  reminder_30min: '30 minutes before',
}

const ACTION_LABEL: Record<string, string> = {
  appointment_booked: 'Booked',
  appointment_cancelled: 'Cancelled',
  appointment_checked_in: 'Checked in',
  appointment_no_show: 'Marked no-show',
  appointment_updated: 'Updated',
  appointment_rescheduled: 'Rescheduled',
}

export function AppointmentDetailClient({ appt, userType }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rDoctorId, setRDoctorId] = useState(appt.doctor.id)
  const [rDate, setRDate] = useState('')
  const [rSlots, setRSlots] = useState<Array<{ id: string; startTime: string; endTime: string; tokenNo: number | null }>>([])
  const [rSlotId, setRSlotId] = useState<string | null>(null)
  const [rLoading, setRLoading] = useState(false)

  const statusMeta = STATUS_META[appt.status] || STATUS_META.booked
  const StatusIcon = statusMeta.icon
  const channelMeta = CHANNEL_META[appt.channel] || CHANNEL_META.whatsapp
  const ChannelIcon = channelMeta.icon

  const isActive = appt.status === 'booked' || appt.status === 'confirmed' || appt.status === 'held'
  const canManage = userType === 'clinic_admin' || userType === 'receptionist' || userType === 'doctor'

  async function doAction(action: 'checkin' | 'noshow' | 'cancel') {
    setBusy(action)
    try {
      const endpoint =
        action === 'checkin' ? `/api/appointments/${appt.id}/checkin` :
        action === 'noshow' ? `/api/appointments/${appt.id}/no-show` :
        `/api/appointments/${appt.id}/cancel`
      const body = action === 'cancel' ? { reason: cancelReason } : undefined
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (json.ok) {
        if (action === 'checkin') {
          toast.success('Patient checked in', { description: json.data.lateBy ? `${json.data.lateBy}m late` : 'On time' })
        } else if (action === 'noshow') {
          toast.success('Marked as no-show', { description: json.data.requiresPrepayment ? 'Requires prepayment next time' : undefined })
        } else {
          toast.success('Appointment cancelled', { description: json.data.refund ? `Refund: PKR ${json.data.refund}` : 'No refund' })
        }
        router.refresh()
      } else {
        toast.error(json.error || `Failed to ${action}`)
      }
    } finally {
      setBusy(null)
      setShowCancelDialog(false)
      setCancelReason('')
    }
  }

  // Load available slots when doctor or date changes in reschedule dialog
  async function loadSlots(doctorId: string, dateStr: string) {
    if (!doctorId || !dateStr) { setRSlots([]); return }
    setRLoading(true)
    setRSlotId(null)
    try {
      const res = await fetch(`/api/slots/available?doctorId=${doctorId}&date=${dateStr}`)
      const j = await res.json()
      if (j.ok) {
        setRSlots(j.data.slots)
      } else {
        toast.error(j.error || 'Failed to load slots')
        setRSlots([])
      }
    } finally {
      setRLoading(false)
    }
  }

  async function doReschedule() {
    if (!rSlotId) { toast.error('Please pick a slot'); return }
    setBusy('reschedule')
    try {
      const res = await fetch(`/api/appointments/${appt.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSlotId: rSlotId,
          newDoctorId: rDoctorId !== appt.doctor.id ? rDoctorId : undefined,
          reason: rescheduleReason || undefined,
        }),
      })
      const j = await res.json()
      if (j.ok) {
        toast.success('Appointment rescheduled', {
          description: `New time: ${new Date(j.data.appointment.start).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
        })
        setShowRescheduleDialog(false)
        setRescheduleReason('')
        setRSlotId(null)
        setRDate('')
        setRSlots([])
        router.refresh()
      } else {
        toast.error(j.error || 'Failed to reschedule')
      }
    } finally {
      setBusy(null)
    }
  }

  const startDate = new Date(appt.start)
  const endDate = new Date(appt.end)
  const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  const createdDate = new Date(appt.createdAt)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/appointments"><ArrowLeft className="w-4 h-4 mr-1" />All appointments</Link>
        </Button>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs font-mono">{appt.id.slice(-8)}</Badge>
          <Badge className={`text-xs gap-1 ${statusMeta.bg} ${statusMeta.color} border-0`}>
            <StatusIcon className="w-3 h-3" />
            {statusMeta.label}
          </Badge>
        </div>
      </div>

      {/* Header card — appointment summary */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: token + date */}
            <div className="flex items-center gap-4 shrink-0">
              {appt.slot?.tokenNo ? (
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl brand-gradient text-brand-foreground shadow-lg shadow-brand/20">
                  <Hash className="w-4 h-4" />
                  <span className="text-3xl font-bold leading-none">{appt.slot.tokenNo}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-80">Token</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-muted text-muted-foreground">
                  <CalendarDays className="w-6 h-6" />
                  <span className="text-[10px] mt-1">No token</span>
                </div>
              )}
            </div>

            {/* Center: title + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{appt.patient.name || appt.patient.phone}</h1>
                {appt.patient.noShowCount >= 3 && (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Habitual no-show</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" />{appt.doctor.name}</span>
                <span>·</span>
                <span>{appt.service?.name || appt.doctor.speciality}</span>
                {appt.familyMember && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />For: {appt.familyMember.name} ({appt.familyMember.relation})</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <MetaItem icon={CalendarDays} label="Date" value={startDate.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
                <MetaItem icon={Clock} label="Time" value={`${startDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} — ${endDate.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`} />
                <MetaItem icon={Activity} label="Duration" value={`${durationMin} min`} />
                <MetaItem icon={ChannelIcon} label="Channel" value={channelMeta.label} valueClass={channelMeta.color} />
              </div>
            </div>

            {/* Right: actions */}
            {canManage && isActive && (
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  className="brand-gradient"
                  onClick={() => doAction('checkin')}
                  disabled={busy !== null}
                >
                  {busy === 'checkin' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Check-in
                </Button>
                <Button variant="outline" onClick={() => setShowRescheduleDialog(true)} disabled={busy !== null}>
                  {busy === 'reschedule' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCw className="w-4 h-4 mr-1" />}
                  Reschedule
                </Button>
                <Button variant="outline" className="text-rose-600 hover:text-rose-700 hover:border-rose-300" onClick={() => doAction('noshow')} disabled={busy !== null}>
                  {busy === 'noshow' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                  No-show
                </Button>
                <Button variant="outline" onClick={() => setShowCancelDialog(true)} disabled={busy !== null}>
                  <Ban className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Cancel dialog inline */}
          {showCancelDialog && (
            <div className="mt-4 p-4 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900">
              <div className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Cancel this appointment?
              </div>
              <textarea
                className="w-full text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-background px-3 py-2 mb-3 focus-brand"
                rows={2}
                placeholder="Reason (optional) — visible in audit log"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="text-xs text-muted-foreground mb-3">
                Refund policy: &gt;4h before = full refund, 2-4h = 50%, &lt;2h = no refund.
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setShowCancelDialog(false); setCancelReason('') }}>Keep appointment</Button>
                <Button size="sm" variant="destructive" onClick={() => doAction('cancel')} disabled={busy !== null}>
                  {busy === 'cancel' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Ban className="w-3 h-3 mr-1" />}
                  Confirm cancel
                </Button>
              </div>
            </div>
          )}

          {/* Reschedule dialog inline */}
          {showRescheduleDialog && (
            <div className="mt-4 p-4 rounded-lg border border-brand/30 bg-brand/5 dark:bg-brand/10">
              <div className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <RotateCw className="w-4 h-4 text-brand" />
                Reschedule this appointment
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Doctor</label>
                  <select
                    className="w-full text-sm rounded-md border bg-background px-3 py-2 focus-brand"
                    value={rDoctorId}
                    onChange={(e) => {
                      setRDoctorId(e.target.value)
                      if (rDate) loadSlots(e.target.value, rDate)
                    }}
                  >
                    <option value={appt.doctor.id}>{appt.doctor.name} (current)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">New date</label>
                  <input
                    type="date"
                    className="w-full text-sm rounded-md border bg-background px-3 py-2 focus-brand"
                    value={rDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setRDate(e.target.value)
                      loadSlots(rDoctorId, e.target.value)
                    }}
                  />
                </div>
              </div>

              {rLoading && (
                <div className="text-sm text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading available slots...
                </div>
              )}

              {!rLoading && rDate && rSlots.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-3">
                  No slots available on this date. Try another date.
                </div>
              )}

              {!rLoading && rSlots.length > 0 && (
                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Available slots ({rSlots.length}) — tap to select
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto scroll-thin">
                    {rSlots.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setRSlotId(s.id)}
                        className={`text-xs px-2 py-1.5 rounded-md border transition-all ${rSlotId === s.id ? 'bg-brand text-brand-foreground border-brand' : 'border-border hover:border-brand/40 hover:bg-accent/40'}`}
                      >
                        {s.startTime}
                        {s.tokenNo && <span className="block text-[9px] opacity-70">#{s.tokenNo}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                className="w-full text-sm rounded-md border bg-background px-3 py-2 mb-3 focus-brand"
                rows={2}
                placeholder="Reason (optional) — visible in audit log"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
              <div className="text-xs text-muted-foreground mb-3">
                Old slot will be released. New reminders scheduled at T-24h, T-2h, T-30min.
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setShowRescheduleDialog(false); setRescheduleReason(''); setRSlotId(null); setRDate(''); setRSlots([]) }}>Cancel</Button>
                <Button size="sm" onClick={doReschedule} disabled={busy !== null || !rSlotId}>
                  {busy === 'reschedule' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCw className="w-3 h-3 mr-1" />}
                  Confirm reschedule
                </Button>
              </div>
            </div>
          )}

          {appt.checkInTime && (
            <div className="mt-4 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Checked in at <strong>{new Date(appt.checkInTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</strong></span>
              {(() => {
                const lateMs = new Date(appt.checkInTime).getTime() - startDate.getTime()
                if (lateMs > 5 * 60 * 1000) {
                  const min = Math.round(lateMs / 60000)
                  return <Badge variant="destructive" className="text-xs">{min}m late</Badge>
                }
                return <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">On time</Badge>
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: fee breakdown + payment + reminders */}
        <div className="space-y-6">
          {/* Fee breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4 text-brand" />Fee Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <FeeRow label="Doctor fee" value={appt.doctorFee} />
              <FeeRow label="Clinic markup" value={appt.clinicMarkup} />
              <FeeRow label="Platform fee" value={appt.platformFee} />
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">PKR {appt.totalFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{appt.paymentMode}</span>
                <Badge variant={appt.paymentStatus === 'paid' ? 'default' : appt.paymentStatus === 'refund_due' || appt.paymentStatus === 'refunded' ? 'secondary' : 'outline'} className="text-xs capitalize">
                  {appt.paymentStatus.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment proof */}
          {appt.paymentProof && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-brand" />Payment Proof</CardTitle>
                <CardDescription>Uploaded by {appt.paymentProof.uploadedBy}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">PKR {appt.paymentProof.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payer</span>
                  <span className="font-medium">{appt.paymentProof.payerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={appt.paymentProof.status === 'confirmed' ? 'default' : appt.paymentProof.status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                    {appt.paymentProof.status}
                  </Badge>
                </div>
                {appt.paymentProof.confirmedAt && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Confirmed</span>
                    <span>{new Date(appt.paymentProof.confirmedAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Patient feedback */}
          {appt.status === 'completed' && (
            <Card className={appt.feedback ? 'border-amber-200 dark:border-amber-900' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Patient Feedback
                </CardTitle>
                {appt.feedback ? (
                  <CardDescription>Submitted {new Date(appt.feedback.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} via {appt.feedback.channel}</CardDescription>
                ) : (
                  <CardDescription>No feedback submitted yet</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {appt.feedback ? (
                  <>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${i < appt.feedback!.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                      <span className="text-sm font-medium ml-1">{appt.feedback.rating}.0</span>
                    </div>
                    {appt.feedback.waitTimeMins !== null && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Patient-reported wait: {appt.feedback.waitTimeMins} min
                      </div>
                    )}
                    {(() => {
                      try {
                        const tags = JSON.parse(appt.feedback.tags || '[]') as string[]
                        if (tags.length === 0) return null
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-xs capitalize">{t.replace('_', ' ')}</Badge>
                            ))}
                          </div>
                        )
                      } catch { return null }
                    })()}
                    {appt.feedback.comment && (
                      <div className="text-sm italic text-foreground/85 bg-muted/30 rounded-md p-3 border-l-2 border-amber-300">
                        &ldquo;{appt.feedback.comment}&rdquo;
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <div className="mb-3">Send the patient a feedback request link:</div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/feedback/${appt.id}`} target="_blank">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open feedback form
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reminders timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-brand" />Reminders</CardTitle>
              <CardDescription>{appt.reminders.length} scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              {appt.reminders.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No reminders scheduled.</div>
              ) : (
                <ol className="space-y-2">
                  {appt.reminders.map((r) => {
                    const isSent = r.status === 'sent'
                    const isFailed = r.status === 'failed'
                    const isPending = r.status === 'pending'
                    return (
                      <li key={r.id} className="flex items-start gap-2 text-sm">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isSent ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-brand'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{REMINDER_LABEL[r.type] || r.type}</span>
                            <Badge variant={isSent ? 'default' : isFailed ? 'destructive' : 'outline'} className="text-[10px] capitalize">{r.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Send at: {new Date(r.sendAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {r.sentAt && ` · Sent: ${new Date(r.sentAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                          {r.error && <div className="text-xs text-rose-600 mt-0.5">Error: {r.error}</div>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center column: patient profile + doctor */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-brand" />Patient</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/patients/${appt.patient.id}`}>Full profile</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-brand-soft text-brand">
                    {appt.patient.name?.charAt(0).toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{appt.patient.name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{appt.patient.phone}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-md bg-muted/40 text-center">
                  <div className="font-bold">{appt.patient.totalVisits}</div>
                  <div className="text-xs text-muted-foreground">Visits</div>
                </div>
                <div className={`p-2 rounded-md text-center ${appt.patient.noShowCount >= 3 ? 'bg-rose-500/10' : 'bg-muted/40'}`}>
                  <div className={`font-bold ${appt.patient.noShowCount >= 3 ? 'text-rose-600' : ''}`}>{appt.patient.noShowCount}</div>
                  <div className="text-xs text-muted-foreground">No-shows</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="capitalize">Gender: {appt.patient.gender} · Language: {appt.patient.preferredLanguage}</div>
                <div className="capitalize">Modality: {appt.patient.preferredModality}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4 text-brand" />Doctor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${appt.doctor.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {appt.doctor.name.charAt(4) || 'D'}
                </div>
                <div>
                  <div className="font-medium">{appt.doctor.name}</div>
                  <div className="text-xs text-muted-foreground">{appt.doctor.speciality}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current status</span>
                <Badge variant={appt.doctor.currentStatus === 'in_clinic' ? 'default' : appt.doctor.currentStatus === 'break' ? 'secondary' : 'outline'} className="text-xs capitalize">
                  {appt.doctor.currentStatus.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {appt.patient.familyMembers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-brand" />Family Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {appt.patient.familyMembers.map((f) => (
                  <div key={f.id} className={`flex justify-between p-1.5 rounded ${f.id === appt.familyMemberId ? 'bg-brand/10' : ''}`}>
                    <span>{f.name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{f.relation}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: audit trail + meta */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-brand" />Activity Trail</CardTitle>
              <CardDescription>{appt.auditLogs.length} events</CardDescription>
            </CardHeader>
            <CardContent>
              {appt.auditLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No activity yet.</div>
              ) : (
                <ol className="relative max-h-[400px] overflow-y-auto scroll-thin pl-2">
                  {appt.auditLogs.map((log, idx) => {
                    const isLast = idx === appt.auditLogs.length - 1
                    return (
                      <li key={log.id} className="relative pl-7 pb-4 group">
                        {!isLast && <span className="absolute left-[10px] top-5 bottom-0 w-0.5 bg-border" aria-hidden />}
                        <span className="absolute left-0 top-1 w-5 h-5 rounded-full bg-brand/15 flex items-center justify-center">
                          <Sparkles className="w-2.5 h-2.5 text-brand" />
                        </span>
                        <div className="text-sm font-medium">{ACTION_LABEL[log.action] || log.action.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">
                          by <span className="capitalize">{log.actorType}</span>
                          {' · '}
                          {new Date(log.ts).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-brand" />Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <MetaRow label="Created via" value={appt.createdVia} />
              <MetaRow label="Created at" value={createdDate.toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              {appt.createdByStaffId && <MetaRow label="Created by staff" value={appt.createdByStaffId.slice(-8)} />}
              {appt.metaMsgId && <MetaRow label="WhatsApp msg ID" value={appt.metaMsgId.slice(-12)} mono />}
              <MetaRow label="Last updated" value={new Date(appt.updatedAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} />
            </CardContent>
          </Card>

          {appt.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand" />Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3">{appt.notes}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaItem({ icon: Icon, label, value, valueClass }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-muted/30 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-sm font-medium mt-0.5 ${valueClass || ''}`}>{value}</div>
    </div>
  )
}

function FeeRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>PKR {value.toLocaleString()}</span>
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  )
}
