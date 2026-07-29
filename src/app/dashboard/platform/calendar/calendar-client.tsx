'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarDays, Video, MapPin, Plus, Loader2, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Appt {
  id: string
  purpose: string
  start: Date
  end: Date
  status: string
  location: string
  meetLink: string | null
  notes: string | null
  staff: { id: string; name: string; role: string } | null
  admin: { id: string; name: string } | null
  clinic: { id: string; name: string; slug: string } | null
}
interface Staff { id: string; name: string; role: string }
interface Clinic { id: string; name: string }

const purposeColor: Record<string, string> = {
  sales: 'bg-chart-1', onboarding: 'bg-chart-2', support: 'bg-chart-4', demo: 'bg-chart-3', check_in: 'bg-chart-5', training: 'bg-brand',
}

export function CalendarClient({ initialAppts, staff, clinics, currentUserId }: { initialAppts: Appt[]; staff: Staff[]; clinics: Clinic[]; currentUserId: string }) {
  const [appts, setAppts] = useState(initialAppts)
  const [viewDate, setViewDate] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ purpose: 'sales', staffId: '', clinicId: '', date: '', startTime: '11:00', duration: '30', location: 'online', notes: '' })

  // Group by date
  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>()
    for (const a of appts) {
      const key = new Date(a.start).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries()).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  }, [appts])

  // Filter to current month
  const filteredDays = byDay.filter(([day]) => {
    const d = new Date(day)
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()
  })

  async function book() {
    if (!form.date || !form.startTime) { toast.error('Date and time required'); return }
    setLoading(true)
    const start = new Date(form.date + 'T' + form.startTime + ':00')
    const end = new Date(start.getTime() + Number(form.duration) * 60 * 1000)
    const res = await fetch('/api/platform/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: form.staffId || null,
        clinicId: form.clinicId || null,
        purpose: form.purpose,
        start: start.toISOString(),
        end: end.toISOString(),
        location: form.location,
        notes: form.notes,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Appointment booked')
    setOpen(false)
    const fresh = await fetch('/api/platform/appointments').then((r) => r.json())
    if (fresh.ok) setAppts(fresh.data)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/platform/appointments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    setAppts((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    toast.success(`Marked ${status}`)
  }

  async function cancel(id: string) {
    const res = await fetch(`/api/platform/appointments/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error); return }
    setAppts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a))
    toast.success('Cancelled')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Platform Calendar</h1>
          <p className="text-muted-foreground">Sales demos, onboarding, support calls, check-ins with clinics</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={`${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`} onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number)
            setViewDate(new Date(y, m - 1, 1))
          }} className="w-40" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Book Appointment</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Book Platform Appointment</DialogTitle>
                <DialogDescription>Schedule a sales demo, onboarding session, or support call with a clinic.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto scroll-thin">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales Demo</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="support">Support Call</SelectItem>
                        <SelectItem value="demo">Product Demo</SelectItem>
                        <SelectItem value="check_in">Monthly Check-in</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online (auto meet link)</SelectItem>
                        <SelectItem value="onsite">Onsite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign to (staff)</Label>
                  <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                    <SelectTrigger><SelectValue placeholder="Default to admin" /></SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Clinic (optional)</Label>
                  <Select value={form.clinicId} onValueChange={(v) => setForm({ ...form, clinicId: v })}>
                    <SelectTrigger><SelectValue placeholder="No clinic" /></SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (min)</Label>
                    <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="60">60</SelectItem>
                        <SelectItem value="90">90</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes / agenda</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Agenda, outcomes..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={book} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-2" />}Book</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDays.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No appointments this month.</CardContent></Card>}
        {filteredDays.map(([day, items]) => (
          <div key={day}>
            <div className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
              {new Date(day).toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="grid gap-2">
              {items.map((a) => (
                <Card key={a.id} className={a.status === 'cancelled' ? 'opacity-50' : ''}>
                  <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1 h-12 rounded ${purposeColor[a.purpose] || 'bg-muted'}`} />
                      <div className="min-w-0">
                        <div className="font-medium capitalize flex items-center gap-2">
                          {a.purpose.replace('_', ' ')}
                          <Badge variant={a.status === 'scheduled' ? 'default' : a.status === 'completed' ? 'secondary' : 'destructive'} className="text-xs capitalize">{a.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.start).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} — {new Date(a.end).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{a.staff?.name || a.admin?.name || 'Unassigned'}
                          {a.clinic && <> · {a.clinic.name}</>}
                        </div>
                        {a.notes && <div className="text-xs text-muted-foreground italic truncate">{a.notes}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.meetLink && a.status === 'scheduled' && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={a.meetLink} target="_blank" rel="noreferrer"><Video className="w-3 h-3 mr-1" />Join</a>
                        </Button>
                      )}
                      {a.status === 'scheduled' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, 'completed')}><CheckCircle2 className="w-3 h-3 mr-1" />Done</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
