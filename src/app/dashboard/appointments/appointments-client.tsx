'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarDays, Search, Filter, ChevronDown, ChevronRight, CheckCircle2, XCircle, Ban, Hash, ExternalLink, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Doctor { id: string; name: string; speciality: string }
interface Appt {
  id: string
  start: Date
  end: Date
  status: string
  channel: string
  paymentStatus: string
  paymentMode: string
  totalFee: number
  doctorFee: number
  extraClinicFee: number
  platformFee: number
  checkInTime: Date | null
  notes: string | null
  patient: { id: string; name: string | null; phone: string; gender: string; totalVisits: number; noShowCount: number }
  doctor: { id: string; name: string; speciality: string }
  service: { name: string } | null
  fees: { baseDoctorFee: number; extraClinicFee: number; platformFee: number; total: number } | null
  slot: { tokenNo: number | null } | null
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  booked: 'secondary',
  confirmed: 'secondary',
  held: 'outline',
  no_show: 'destructive',
  cancelled: 'destructive',
  late_no_show: 'destructive',
  invalid: 'destructive',
}

export function AppointmentsClient({ appointments, doctors, userType }: { appointments: Appt[]; doctors: Doctor[]; userType: string }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [doctorId, setDoctorId] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [channel, setChannel] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkReason, setBulkReason] = useState('')

  const filtered = appointments.filter((a) => {
    const matchSearch = !search ||
      a.patient.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.patient.phone.includes(search) ||
      a.doctor.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === 'all' || a.status === status
    const matchDoctor = doctorId === 'all' || a.doctor.id === doctorId
    const matchChannel = channel === 'all' || a.channel === channel
    const aStart = new Date(a.start).toISOString().slice(0, 10)
    const matchFrom = !from || aStart >= from
    const matchTo = !to || aStart <= to
    return matchSearch && matchStatus && matchDoctor && matchChannel && matchFrom && matchTo
  })

  async function checkIn(id: string) {
    setBusyId(id + '-checkin')
    const res = await fetch(`/api/appointments/${id}/checkin`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success(`Checked in (${json.data.status})`)
    router.refresh()
  }
  async function markNoShow(id: string) {
    setBusyId(id + '-noshow')
    const res = await fetch(`/api/appointments/${id}/no-show`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Marked as no-show')
    router.refresh()
  }
  async function cancel(id: string) {
    setBusyId(id + '-cancel')
    const res = await fetch(`/api/appointments/${id}/cancel`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Appointment cancelled')
    router.refresh()
  }

  // --- Bulk actions ---
  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const a of filtered) {
        // Only allow selecting cancellable appointments
        if (a.status === 'booked' || a.status === 'confirmed' || a.status === 'held') {
          next.add(a.id)
        }
      }
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setShowBulkConfirm(false)
    setBulkReason('')
  }

  async function bulkCancel() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/appointments/bulk-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentIds: ids, reason: bulkReason || undefined }),
      })
      const j = await res.json()
      if (j.ok) {
        toast.success(`${j.data.cancelled} appointment${j.data.cancelled !== 1 ? 's' : ''} cancelled`, {
          description: j.data.skipped > 0 ? `${j.data.skipped} skipped (already terminal)` : undefined,
        })
        clearSelection()
        router.refresh()
      } else {
        toast.error(j.error || 'Bulk cancel failed')
      }
    } finally {
      setBulkLoading(false)
    }
  }

  // Count cancellable items among selection
  const selectedCancellable = filtered.filter((a) => selected.has(a.id) && (a.status === 'booked' || a.status === 'confirmed' || a.status === 'held')).length
  const selectedTotal = selected.size

  const canManage = userType === 'clinic_admin' || userType === 'receptionist' || userType === 'doctor'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-muted-foreground">{filtered.length} of {appointments.length} appointments · click a row to expand</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search patient, phone, doctor…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no_show">No-show</SelectItem>
                <SelectItem value="late_no_show">Late no-show</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue placeholder="Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4" />Results</CardTitle>
              <CardDescription>Sorted newest first</CardDescription>
            </div>
            {canManage && filtered.length > 0 && (
              <Button size="sm" variant="outline" onClick={selectAllVisible} disabled={bulkLoading}>
                Select all active
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk action bar — appears when items are selected */}
          {canManage && selectedTotal > 0 && (
            <div className="mb-3 p-3 rounded-lg border border-brand/30 bg-brand/5 flex items-center justify-between flex-wrap gap-2 slide-up">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="default" className="gap-1">
                  <span className="font-bold">{selectedCancellable}</span> selected
                </Badge>
                {selectedCancellable !== selectedTotal && (
                  <span className="text-xs text-muted-foreground">({selectedTotal - selectedCancellable} already terminal)</span>
                )}
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection} disabled={bulkLoading}>
                  <X className="w-3 h-3 mr-1" />Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {!showBulkConfirm ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowBulkConfirm(true)}
                    disabled={bulkLoading || selectedCancellable === 0}
                  >
                    <Ban className="w-3 h-3 mr-1" />Cancel selected
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 slide-up">
                    <Input
                      className="h-8 w-48 text-xs"
                      placeholder="Reason (optional)"
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      disabled={bulkLoading}
                    />
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowBulkConfirm(false); setBulkReason('') }} disabled={bulkLoading}>Keep</Button>
                    <Button size="sm" variant="destructive" onClick={bulkCancel} disabled={bulkLoading}>
                      {bulkLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Ban className="w-3 h-3 mr-1" />}
                      Confirm cancel ({selectedCancellable})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="max-h-[36rem] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && <TableHead className="w-10"></TableHead>}
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Channel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">No appointments match.</TableCell></TableRow>
                )}
                {filtered.map((a) => {
                  const isOpen = expanded === a.id
                  const isActive = a.status === 'booked' || a.status === 'confirmed' || a.status === 'held'
                  const isSelected = selected.has(a.id)
                  return (
                    <Fragment key={a.id}>
                      <TableRow className={`cursor-pointer ${isSelected ? 'bg-brand/5' : ''}`} onClick={() => setExpanded(isOpen ? null : a.id)}>
                        {canManage && (
                          <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(v) => toggleSelect(a.id, v === true)}
                              disabled={!isActive && !isSelected}
                              aria-label={`Select appointment ${a.id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{new Date(a.start).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</div>
                          <div className="text-muted-foreground">{new Date(a.start).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.patient.name || a.patient.phone}</div>
                          <div className="text-xs text-muted-foreground">{a.patient.phone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{a.doctor.name}</div>
                          <div className="text-xs text-muted-foreground">{a.service?.name || a.doctor.speciality}</div>
                        </TableCell>
                        <TableCell className="text-right text-sm">PKR {a.totalFee}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={STATUS_VARIANT[a.status] || 'outline'} className="text-xs capitalize">{a.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs capitalize">{a.channel}</Badge>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={a.id + '-detail'} className="bg-muted/30">
                          <TableCell colSpan={canManage ? 8 : 7} className="p-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              {/* Patient info */}
                              <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Patient</div>
                                <div className="text-sm">
                                  <div><strong>Name:</strong> {a.patient.name || 'Unknown'}</div>
                                  <div><strong>Phone:</strong> {a.patient.phone}</div>
                                  <div><strong>Gender:</strong> <span className="capitalize">{a.patient.gender}</span></div>
                                  <div><strong>Visits:</strong> {a.patient.totalVisits} · No-shows: {a.patient.noShowCount}</div>
                                </div>
                                {a.slot?.tokenNo && (
                                  <Badge variant="outline" className="text-xs"><Hash className="w-3 h-3 mr-1" />Token #{a.slot.tokenNo}</Badge>
                                )}
                              </div>

                              {/* Fee breakdown */}
                              <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Fees</div>
                                <div className="rounded-md border divide-y text-sm">
                                  <Row label="Doctor fee" value={`PKR ${a.doctorFee}`} />
                                  <Row label="Extra clinic fee" value={`PKR ${a.extraClinicFee}`} />
                                  <Row label="Platform fee" value={`PKR ${a.platformFee}`} />
                                  <Row label="Total" value={`PKR ${a.totalFee}`} strong />
                                  <Row label="Payment" value={`${a.paymentMode} · ${a.paymentStatus}`} />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Actions</div>
                                <div className="text-xs space-y-1">
                                  <div><strong>Booked at:</strong> {new Date(a.start).toLocaleString('en-PK')}</div>
                                  {a.checkInTime && <div><strong>Checked in:</strong> {new Date(a.checkInTime).toLocaleTimeString('en-PK')}</div>}
                                  {a.notes && <div><strong>Notes:</strong> {a.notes}</div>}
                                </div>
                                <Button asChild size="sm" variant="outline" className="h-7">
                                  <Link href={`/dashboard/appointments/${a.id}`}><ExternalLink className="w-3 h-3 mr-1" />View details</Link>
                                </Button>
                                {canManage && isActive && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    <Button size="sm" className="h-7" onClick={() => checkIn(a.id)} disabled={busyId === a.id + '-checkin'}>
                                      <CheckCircle2 className="w-3 h-3 mr-1" />Check-in
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-destructive hover:text-destructive" onClick={() => markNoShow(a.id)} disabled={busyId === a.id + '-noshow'}>
                                      <XCircle className="w-3 h-3 mr-1" />No-show
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7" onClick={() => cancel(a.id)} disabled={busyId === a.id + '-cancel'}>
                                      <Ban className="w-3 h-3 mr-1" />Cancel
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between p-2 ${strong ? 'font-semibold bg-muted/50' : ''}`}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
