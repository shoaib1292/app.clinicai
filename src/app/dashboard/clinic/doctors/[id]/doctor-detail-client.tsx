'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, Stethoscope, CalendarDays, Clock, Activity, Plus, User, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface Schedule { id: string; dayOfWeek: number; startTime: string; endTime: string; breakWindows: string; isEmergency: boolean }
interface Service { id: string; name: string; durationMin: number; baseFee: number; extraClinicFee?: number | null }
interface ScheduleOverride { id: string; date: Date; type: string; startTime: string | null; endTime: string | null; reason: string | null }
interface Doctor {
  id: string; name: string; gender: string; speciality: string; slotDurationMin: number
  queueMode: string; currentStatus: string; statusEta: number | null; workingHours: string
  phone: string | null; email: string | null; active: boolean
  canTelemedicine: boolean; telemedicineFee: number
  qualifications?: string | null; bio?: string | null; languages?: string | null; imageKey?: string | null; displayOnWebsite?: boolean
  schedules: Schedule[]; scheduleOverrides: ScheduleOverride[]; services: Service[]
  _count: { appointments: number }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_LABELS_SHORT: Record<string, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' }

type DaySchedule = { start: string; end: string; breaks: { start: string; end: string }[] }

function parseWorkingHours(raw: string): Record<string, DaySchedule> {
  try {
    const parsed = JSON.parse(raw || '{}')
    for (const day of DAY_KEYS) {
      if (!parsed[day]) continue
    }
    return parsed
  } catch {
    return {}
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_clinic: { label: 'In Clinic', color: 'bg-chart-2' },
  break: { label: 'On Break', color: 'bg-chart-4' },
  off: { label: 'Off Duty', color: 'bg-muted-foreground' },
  on_way: { label: 'On the Way', color: 'bg-chart-3' },
}

export function DoctorDetailClient({ doctor: initial }: { doctor: Doctor }) {
  const [doctor, setDoctor] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [editWhExpanded, setEditWhExpanded] = useState(false)
  const [editWh, setEditWh] = useState<Record<string, DaySchedule>>(() => {
    const parsed = parseWorkingHours(initial.workingHours)
    const filled: Record<string, DaySchedule> = {}
    for (const day of DAY_KEYS) {
      if (parsed[day]) filled[day] = parsed[day]
    }
    return filled
  })
  const [form, setForm] = useState({
    name: initial.name,
    gender: initial.gender,
    speciality: initial.speciality,
    slotDurationMin: String(initial.slotDurationMin),
    queueMode: initial.queueMode,
  })
  const [override, setOverride] = useState({ date: '', type: 'leave', startTime: '', endTime: '', reason: '' })
  const [saving, setSaving] = useState(false)

  function toggleEditDay(day: string) {
    setEditWh((prev) => {
      const next = { ...prev }
      if (next[day]) {
        delete next[day]
      } else {
        next[day] = { start: '09:00', end: '17:00', breaks: [] }
      }
      return next
    })
  }

  function updateEditDayTime(day: string, field: 'start' | 'end', value: string) {
    setEditWh((prev) => {
      if (!prev[day]) return prev
      return { ...prev, [day]: { ...prev[day], [field]: value } }
    })
  }

  function addEditDayBreak(day: string) {
    setEditWh((prev) => {
      if (!prev[day]) return prev
      return { ...prev, [day]: { ...prev[day], breaks: [...prev[day].breaks, { start: '13:00', end: '14:00' }] } }
    })
  }

  function removeEditDayBreak(day: string, idx: number) {
    setEditWh((prev) => {
      if (!prev[day]) return prev
      return { ...prev, [day]: { ...prev[day], breaks: prev[day].breaks.filter((_, i) => i !== idx) } }
    })
  }

  function updateEditDayBreak(day: string, idx: number, field: 'start' | 'end', value: string) {
    setEditWh((prev) => {
      if (!prev[day]) return prev
      const breaks = [...prev[day].breaks]
      breaks[idx] = { ...breaks[idx], [field]: value }
      return { ...prev, [day]: { ...prev[day], breaks } }
    })
  }

  async function saveEdit() {
    setSaving(true)
    const res = await fetch(`/api/doctors/${doctor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        gender: form.gender,
        speciality: form.speciality,
        slotDurationMin: Number(form.slotDurationMin),
        queueMode: form.queueMode,
      }),
    })
    setSaving(false)
    const json = await res.json()
    if (json.ok) {
      setDoctor({ ...doctor, ...json.data })
      setEditOpen(false)
      toast.success('Doctor updated')
    } else toast.error(json.error || 'Failed')
  }

  async function saveSchedule() {
    setSaving(true)
    const workingHoursPayload: Record<string, DaySchedule> = {}
    for (const day of DAY_KEYS) {
      if (editWh[day]) {
        workingHoursPayload[day] = editWh[day]
      }
    }
    const res = await fetch(`/api/doctors/${doctor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workingHours: workingHoursPayload }),
    })
    setSaving(false)
    const json = await res.json()
    if (json.ok) {
      setDoctor({ ...doctor, workingHours: JSON.stringify(workingHoursPayload), ...json.data })
      setScheduleOpen(false)
      toast.success('Schedule updated')
    } else toast.error(json.error || 'Failed')
  }

  async function addOverride() {
    if (!override.date) { toast.error('Date required'); return }
    setSaving(true)
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId: doctor.id,
        date: override.date,
        type: override.type,
        startTime: override.startTime || null,
        endTime: override.endTime || null,
        reason: override.reason,
      }),
    })
    setSaving(false)
    const json = await res.json()
    if (json.ok) {
      toast.success('Schedule override added')
      setOverrideOpen(false)
      setOverride({ date: '', type: 'leave', startTime: '', endTime: '', reason: '' })
      // Refresh by reloading
      window.location.reload()
    } else toast.error(json.error || 'Failed')
  }

  async function setStatus(status: string) {
    const res = await fetch(`/api/doctors/${doctor.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (json.ok) {
      setDoctor({ ...doctor, currentStatus: status })
      toast.success(`Status: ${STATUS_LABELS[status]?.label || status}`)
    } else toast.error(json.error)
  }

  const statusInfo = STATUS_LABELS[doctor.currentStatus] || STATUS_LABELS.off
  const wh = JSON.parse(doctor.workingHours || '{}')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/clinic/doctors"><ArrowLeft className="w-4 h-4 mr-1" />All doctors</Link></Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold ${doctor.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>
              {doctor.name.charAt(4) || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{doctor.name}</h1>
                <Badge variant="outline" className="capitalize">{doctor.gender}</Badge>
                <Badge variant="secondary" className="capitalize">{doctor.speciality}</Badge>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                  <span className="text-sm">{statusInfo.label}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{doctor.slotDurationMin}min slots</span>
                <span>·</span>
                <span className="capitalize">{doctor.queueMode} queue</span>
                <span>·</span>
                <span>{doctor._count.appointments} appointments</span>
                {doctor.email && <><span>·</span><span>{doctor.email}</span></>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}><CalendarDays className="w-3 h-3 mr-1" />Schedule</Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
            </div>
          </div>

          {/* Quick status setter */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">Quick Status Set</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_LABELS).map(([key, info]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={doctor.currentStatus === key ? 'default' : 'outline'}
                  onClick={() => setStatus(key)}
                  className="gap-1.5"
                >
                  <span className={`w-2 h-2 rounded-full ${info.color}`} />
                  {info.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" />Weekly Schedule</CardTitle>
            <CardDescription>Working hours per day with breaks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {DAYS.map((day, idx) => {
              const dayKey = day.toLowerCase().slice(0, 3)
              const dayWh = wh[dayKey]
              const schedule = doctor.schedules.find((s) => s.dayOfWeek === idx)
              if (!dayWh && !schedule) {
                return (
                  <div key={day} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="text-sm font-medium w-20">{day}</span>
                    <Badge variant="outline" className="text-xs">Off</Badge>
                  </div>
                )
              }
              const breaks = schedule ? JSON.parse(schedule.breakWindows || '[]') : (dayWh?.breaks || [])
              return (
                <div key={day} className="flex items-center justify-between p-2 rounded-md border">
                  <span className="text-sm font-medium w-20">{day}</span>
                  <div className="flex-1 text-right">
                    <div className="text-sm font-mono">{dayWh?.start || schedule?.startTime} — {dayWh?.end || schedule?.endTime}</div>
                    {breaks.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Breaks: {breaks.map((b: { start: string; end: string }) => `${b.start}-${b.end}`).join(', ')}
                      </div>
                    )}
                    {schedule?.isEmergency && <Badge variant="destructive" className="text-xs ml-1">Emergency</Badge>}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Services + Overrides */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />Services</CardTitle>
              <CardDescription>{doctor.services.length} services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {doctor.services.length === 0 && <div className="text-center text-muted-foreground py-4 text-sm">No services configured.</div>}
              {doctor.services.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-md border">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.durationMin}min</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">PKR {s.baseFee + (s.extraClinicFee ?? 0) + 50}</div>
                    <div className="text-xs text-muted-foreground">+50 platform</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4" />Schedule Overrides</CardTitle>
                <CardDescription>Leave, blocks, emergencies</CardDescription>
              </div>
              <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" />Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Schedule Override</DialogTitle>
                    <DialogDescription>Block time off, mark leave, or add emergency availability.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={override.type} onValueChange={(v) => setOverride({ ...override, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leave">Leave (full day off)</SelectItem>
                          <SelectItem value="block">Block (partial)</SelectItem>
                          <SelectItem value="emergency">Emergency slot added</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={override.date} onChange={(e) => setOverride({ ...override, date: e.target.value })} />
                    </div>
                    {override.type !== 'leave' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Start time</Label>
                          <Input type="time" value={override.startTime} onChange={(e) => setOverride({ ...override, startTime: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>End time</Label>
                          <Input type="time" value={override.endTime} onChange={(e) => setOverride({ ...override, endTime: e.target.value })} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Input value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} placeholder="e.g., Family emergency" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
                    <Button onClick={addOverride} disabled={saving}>Add Override</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-2">
              {doctor.scheduleOverrides.length === 0 && <div className="text-center text-muted-foreground py-4 text-sm">No overrides.</div>}
              {doctor.scheduleOverrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-md border">
                  <div>
                    <div className="text-sm font-medium capitalize">{o.type}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  </div>
                  <div className="text-right">
                    {o.startTime && o.endTime && <div className="text-xs font-mono">{o.startTime}—{o.endTime}</div>}
                    {o.reason && <div className="text-xs text-muted-foreground">{o.reason}</div>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>Update doctor profile and queue settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Speciality</Label>
                <Input value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Slot duration (min)</Label>
                <Select value={form.slotDurationMin} onValueChange={(v) => setForm({ ...form, slotDurationMin: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="45">45</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Queue mode</Label>
                <Select value={form.queueMode} onValueChange={(v) => setForm({ ...form, queueMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="token">Token-based</SelectItem>
                    <SelectItem value="time">Time-based</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Weekly Schedule</DialogTitle>
            <DialogDescription>Set working hours and breaks for each day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Days</span>
              <span className="text-xs text-muted-foreground">{DAY_KEYS.filter((d) => editWh[d]).length} of 7 active</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DAY_KEYS.map((day) => {
                const active = !!editWh[day]
                return (
                  <Button
                    key={day}
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    className="h-8 px-2.5 text-xs"
                    onClick={() => toggleEditDay(day)}
                  >
                    {DAY_LABELS_SHORT[day]}
                  </Button>
                )
              })}
            </div>

            {DAY_KEYS.filter((d) => editWh[d]).length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setEditWhExpanded(!editWhExpanded)}
                >
                  {editWhExpanded ? 'Collapse hours & breaks' : 'Edit hours & breaks'}
                </Button>
                {editWhExpanded && (
                  <div className="space-y-2 border rounded-lg p-3">
                    {DAY_KEYS.filter((d) => editWh[d]).map((day) => {
                      const s = editWh[day]
                      if (!s) return null
                      return (
                        <div key={day} className="border rounded-md p-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">{DAY_LABELS_SHORT[day]}</span>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => toggleEditDay(day)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Start</Label>
                              <Input type="time" className="h-7 text-xs" value={s.start} onChange={(e) => updateEditDayTime(day, 'start', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">End</Label>
                              <Input type="time" className="h-7 text-xs" value={s.end} onChange={(e) => updateEditDayTime(day, 'end', e.target.value)} />
                            </div>
                          </div>
                          {s.breaks.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <Label className="text-[10px] text-muted-foreground">Breaks</Label>
                              {s.breaks.map((b, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <Input type="time" className="h-7 text-xs flex-1" value={b.start} onChange={(e) => updateEditDayBreak(day, i, 'start', e.target.value)} />
                                  <span className="text-xs text-muted-foreground">to</span>
                                  <Input type="time" className="h-7 text-xs flex-1" value={b.end} onChange={(e) => updateEditDayBreak(day, i, 'end', e.target.value)} />
                                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeEditDayBreak(day, i)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => addEditDayBreak(day)}>
                            + Add break
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={saveSchedule} disabled={saving}>Save Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
