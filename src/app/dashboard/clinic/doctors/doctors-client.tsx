'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Stethoscope, Plus, Loader2, LogIn, Coffee, Car, LogOut, Pencil, X, CalendarDays, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Doctor {
  id: string
  name: string
  gender: string
  speciality: string
  slotDurationMin: number
  queueMode: string
  currentStatus: string
  statusEta: number | null
  email: string | null
  canTelemedicine: boolean
  telemedicineFee: number
  workingHours: string
  services: Array<{ id: string; name: string }>
  _count: { appointments: number; slots: number }
  createdAt: Date
}

const STATUS_BUTTONS = [
  { key: 'in_clinic', label: 'In', icon: LogIn },
  { key: 'break', label: 'Break', icon: Coffee },
  { key: 'on_way', label: 'On Way', icon: Car },
  { key: 'off', label: 'Off', icon: LogOut },
] as const

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  in_clinic: 'default',
  break: 'secondary',
  on_way: 'secondary',
  off: 'outline',
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const DAY_LABELS: Record<string, string> = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' }

type DaySchedule = { start: string; end: string; breaks: { start: string; end: string }[] }

function parseWorkingHours(raw: string): Record<string, DaySchedule> {
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}

const EMPTY_FORM = {
  name: '', gender: 'male', speciality: '', slotDurationMin: '15', queueMode: 'hybrid', email: '', password: '',
  canTelemedicine: false, telemedicineFee: '0',
}

export function DoctorsClient({ doctors }: { doctors: Doctor[] }) {
  const [list, setList] = useState(doctors)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [busyStatus, setBusyStatus] = useState<string | null>(null)

  // Separate schedule popup
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null)
  const [scheduleWh, setScheduleWh] = useState<Record<string, DaySchedule>>({})
  const [scheduleSaving, setScheduleSaving] = useState(false)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setOpen(true)
  }

  function openEdit(d: Doctor) {
    setForm({
      name: d.name, gender: d.gender, speciality: d.speciality,
      slotDurationMin: String(d.slotDurationMin), queueMode: d.queueMode,
      email: d.email || '', password: '',
      canTelemedicine: d.canTelemedicine ?? false, telemedicineFee: String(d.telemedicineFee ?? 0),
    })
    setEditId(d.id)
    setOpen(true)
  }

  function openSchedule(d: Doctor) {
    setScheduleDoctor(d)
    const parsed = parseWorkingHours(d.workingHours)
    const filled: Record<string, DaySchedule> = {}
    for (const day of DAYS) {
      if (parsed[day]) filled[day] = parsed[day]
    }
    setScheduleWh(filled)
    setScheduleOpen(true)
  }

  function toggleScheduleDay(day: string) {
    setScheduleWh((prev) => {
      const next = { ...prev }
      if (next[day]) {
        delete next[day]
      } else {
        next[day] = { start: '09:00', end: '17:00', breaks: [] }
      }
      return next
    })
  }

  function updateScheduleDayTime(day: string, field: 'start' | 'end', value: string) {
    setScheduleWh((prev) => {
      if (!prev[day]) return prev
      return { ...prev, [day]: { ...prev[day], [field]: value } }
    })
  }

  function addScheduleDayBreak(day: string) {
    setScheduleWh((prev) => {
      if (!prev[day]) return prev
      return { ...prev, [day]: { ...prev[day], breaks: [...prev[day].breaks, { start: '13:00', end: '14:00' }] } }
    })
  }

  function removeScheduleDayBreak(day: string, idx: number) {
    setScheduleWh((prev) => {
      if (!prev[day]) return prev
      return { ...prev, [day]: { ...prev[day], breaks: prev[day].breaks.filter((_, i) => i !== idx) } }
    })
  }

  function updateScheduleDayBreak(day: string, idx: number, field: 'start' | 'end', value: string) {
    setScheduleWh((prev) => {
      if (!prev[day]) return prev
      const breaks = [...prev[day].breaks]
      breaks[idx] = { ...breaks[idx], [field]: value }
      return { ...prev, [day]: { ...prev[day], breaks } }
    })
  }

  async function saveSchedule() {
    if (!scheduleDoctor) return
    setScheduleSaving(true)
    const workingHoursPayload: Record<string, DaySchedule> = {}
    for (const day of DAYS) {
      if (scheduleWh[day]) workingHoursPayload[day] = scheduleWh[day]
    }
    const res = await fetch(`/api/doctors/${scheduleDoctor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workingHours: workingHoursPayload }),
    })
    setScheduleSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Schedule update failed'); return }
    toast.success('Schedule updated')
    setScheduleOpen(false)
    const fresh = await fetch('/api/doctors').then((r) => r.json())
    if (fresh.ok) setList(fresh.data)
  }

  async function save() {
    if (!form.name || !form.speciality) { toast.error('Name and speciality required'); return }
    setLoading(true)
    const payload: Record<string, unknown> = {
      name: form.name, gender: form.gender, speciality: form.speciality,
      slotDurationMin: Number(form.slotDurationMin), queueMode: form.queueMode,
      email: form.email || undefined, password: form.password || undefined,
      canTelemedicine: form.canTelemedicine, telemedicineFee: Number(form.telemedicineFee),
    }
    if (editId) {
      const res = await fetch(`/api/doctors/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      setLoading(false)
      if (!json.ok) { toast.error(json.error || 'Update failed'); return }
      toast.success('Doctor updated')
    } else {
      const res = await fetch('/api/doctors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      setLoading(false)
      if (!json.ok) { toast.error(json.error || 'Create failed'); return }
      toast.success('Doctor added')
    }
    setOpen(false)
    const fresh = await fetch('/api/doctors').then((r) => r.json())
    if (fresh.ok) setList(fresh.data)
  }

  async function setStatus(id: string, status: string) {
    setBusyStatus(id + status)
    const res = await fetch(`/api/doctors/${id}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    const json = await res.json()
    setBusyStatus(null)
    if (!json.ok) { toast.error(json.error || 'Status update failed'); return }
    setList((prev) => prev.map((d) => d.id === id ? { ...d, currentStatus: status } : d))
    toast.success(`Status updated`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Doctors</h1>
          <p className="text-muted-foreground">{list.length} doctor{list.length !== 1 ? 's' : ''} · manage profiles, schedules, and live status</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Doctor</Button></DialogTrigger>
          <DialogContent className="max-w-md sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
              <DialogDescription>Doctor profile and optional login credentials.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Ahmed" />
                </div>
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
              </div>
              <div className="space-y-2">
                <Label>Speciality</Label>
                <Input value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} placeholder="General Physician" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Slot Duration (min)</Label>
                  <Input type="number" value={form.slotDurationMin} onChange={(e) => setForm({ ...form, slotDurationMin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Queue Mode</Label>
                  <Select value={form.queueMode} onValueChange={(v) => setForm({ ...form, queueMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token">Token</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Login Email (optional)</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@clinic.pk" />
                </div>
                <div className="space-y-2">
                  <Label>{editId ? 'New Password (blank=keep)' : 'Password'}</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
                </div>
              </div>
              <Separator />
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Video Consultations</Label>
                    <p className="text-xs text-muted-foreground">Allow patients to book video appointments with this doctor</p>
                  </div>
                  <Switch checked={form.canTelemedicine} onCheckedChange={(v) => setForm({ ...form, canTelemedicine: v })} />
                </div>
                {form.canTelemedicine && (
                  <div className="space-y-2">
                    <Label>Additional Video Fee (PKR)</Label>
                    <Input type="number" value={form.telemedicineFee} onChange={(e) => setForm({ ...form, telemedicineFee: e.target.value })} placeholder="0" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}
                {editId ? 'Save Changes' : 'Add Doctor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Dialog */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 top-[5vh] translate-y-0" showCloseButton={false}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <DialogHeader className="text-left p-0 gap-0.5">
                <DialogTitle>Edit Weekly Schedule</DialogTitle>
                <DialogDescription>{scheduleDoctor?.name} — set working hours and breaks for each day.</DialogDescription>
              </DialogHeader>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setScheduleOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Day toggles */}
            <div className="px-5 pb-2 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Days</span>
                <span className="text-xs text-muted-foreground">{DAYS.filter((d) => scheduleWh[d]).length} of 7 active</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day) => {
                  const active = !!scheduleWh[day]
                  return (
                    <Button key={day} size="sm" variant={active ? 'default' : 'outline'} className="h-8 px-2.5 text-xs" onClick={() => toggleScheduleDay(day)}>
                      {DAY_LABELS[day]}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Copy Monday action */}
            {scheduleWh.mon && DAYS.filter((d) => scheduleWh[d]).length >= 2 && (
              <div className="px-5 pb-2 shrink-0">
                <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                  const monSchedule = scheduleWh.mon
                  if (!monSchedule) return
                  setScheduleWh((prev) => {
                    const next = { ...prev }
                    for (const day of ['tue', 'wed', 'thu', 'fri', 'sat'] as const) {
                      if (next[day]) {
                        next[day] = { ...monSchedule, breaks: monSchedule.breaks.map(b => ({ ...b })) }
                      }
                    }
                    return next
                  })
                  toast.success('Copied Monday hours to all active days')
                }}>
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy Monday schedule to all days
                </Button>
              </div>
            )}

            {/* Scrollable accordion body */}
            <ScrollArea className="flex-1 min-h-0 px-5">
              {DAYS.filter((d) => scheduleWh[d]).length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">Select days above to configure working hours.</div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2 pb-3">
                  {DAYS.filter((d) => scheduleWh[d]).map((day) => {
                    const s = scheduleWh[day]
                    if (!s) return null
                    return (
                      <AccordionItem key={day} value={day} className="border rounded-lg px-3 data-[state=open]:border-primary/50">
                        <AccordionTrigger className="py-2.5 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{DAY_LABELS[day]}</span>
                              <span className="text-xs text-muted-foreground font-mono">{s.start} – {s.end}</span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0"
                              onClick={(e) => { e.stopPropagation(); toggleScheduleDay(day) }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 pt-0">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px]">Start Time</Label>
                                <Input type="time" className="h-8 text-xs" value={s.start} onChange={(e) => updateScheduleDayTime(day, 'start', e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">End Time</Label>
                                <Input type="time" className="h-8 text-xs" value={s.end} onChange={(e) => updateScheduleDayTime(day, 'end', e.target.value)} />
                              </div>
                            </div>

                            {/* Breaks */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">Breaks</Label>
                                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => addScheduleDayBreak(day)}>
                                  + Add
                                </Button>
                              </div>
                              {s.breaks.length === 0 && (
                                <p className="text-xs text-muted-foreground">No breaks configured.</p>
                              )}
                              {s.breaks.map((b, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <Input type="time" className="h-8 text-xs flex-1 min-w-0" value={b.start} onChange={(e) => updateScheduleDayBreak(day, i, 'start', e.target.value)} />
                                  <span className="text-xs text-muted-foreground shrink-0">to</span>
                                  <Input type="time" className="h-8 text-xs flex-1 min-w-0" value={b.end} onChange={(e) => updateScheduleDayBreak(day, i, 'end', e.target.value)} />
                                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeScheduleDayBreak(day, i)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-5 py-4 border-t shrink-0 bg-background">
              <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                <Button onClick={saveSchedule} disabled={scheduleSaving}>
                  {scheduleSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Schedule
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d) => (
          <Card key={d.id} className="hover:border-brand transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Link href={`/dashboard/clinic/doctors/${d.id}`} className="flex items-center gap-2 hover:opacity-80">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${d.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>
                    {d.name.charAt(4) || d.name.charAt(0) || 'D'}
                  </div>
                  <div>
                    <div className="font-medium hover:text-brand transition-colors">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.speciality}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSchedule(d)} aria-label="Schedule">
                    <CalendarDays className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)} aria-label="Edit">
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <Badge variant={STATUS_VARIANT[d.currentStatus] || 'outline'} className="capitalize">{d.currentStatus.replace('_', ' ')}</Badge>
                <span className="text-muted-foreground">{d._count.appointments} appts · {d.services?.length ?? 0} svc</span>
              </div>

              <div className="text-xs text-muted-foreground">{d.slotDurationMin}-min slots · {d.queueMode} queue</div>

              {/* Mini schedule summary */}
              {d.workingHours && (() => {
                try {
                  const wh = JSON.parse(d.workingHours)
                  const activeDays = DAYS.filter((day) => wh[day])
                  return activeDays.length > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      {activeDays.map((d) => DAY_LABELS[d]).join(', ')}
                    </div>
                  ) : null
                } catch { return null }
              })()}

              <div className="grid grid-cols-4 gap-1">
                {STATUS_BUTTONS.map((s) => {
                  const Icon = s.icon
                  const active = d.currentStatus === s.key
                  return (
                    <Button
                      key={s.key}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="h-auto py-1.5 flex flex-col items-center gap-0.5"
                      onClick={() => setStatus(d.id, s.key)}
                      disabled={busyStatus === d.id + s.key}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="text-[10px]">{s.label}</span>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              No doctors yet. Click <strong>Add Doctor</strong> to create the first one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
