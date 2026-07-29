'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, Stethoscope, CalendarDays, Clock, Activity, Plus, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Schedule { id: string; dayOfWeek: number; startTime: string; endTime: string; breakWindows: string; isEmergency: boolean }
interface Service { id: string; name: string; durationMin: number; baseFee: number; extraClinicFee: number }
interface ScheduleOverride { id: string; date: Date; type: string; startTime: string | null; endTime: string | null; reason: string | null }
interface Doctor {
  id: string; name: string; gender: string; speciality: string; slotDurationMin: number
  queueMode: string; currentStatus: string; statusEta: number | null; workingHours: string
  phone: string | null; email: string | null; active: boolean
  schedules: Schedule[]; scheduleOverrides: ScheduleOverride[]; services: Service[]
  _count: { appointments: number }
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_clinic: { label: 'In Clinic', color: 'bg-chart-2' },
  break: { label: 'On Break', color: 'bg-chart-4' },
  off: { label: 'Off Duty', color: 'bg-muted-foreground' },
  on_way: { label: 'On the Way', color: 'bg-chart-3' },
}

export function DoctorDetailClient({ doctor: initial }: { doctor: Doctor }) {
  const [doctor, setDoctor] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [form, setForm] = useState({
    name: initial.name,
    gender: initial.gender,
    speciality: initial.speciality,
    slotDurationMin: String(initial.slotDurationMin),
    queueMode: initial.queueMode,
  })
  const [override, setOverride] = useState({ date: '', type: 'leave', startTime: '', endTime: '', reason: '' })
  const [saving, setSaving] = useState(false)

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
                    <div className="text-sm font-semibold">PKR {s.baseFee + s.extraClinicFee + 50}</div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Doctor</DialogTitle>
            <DialogDescription>Update doctor profile and queue settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
    </div>
  )
}
