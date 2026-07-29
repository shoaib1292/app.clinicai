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
import { Stethoscope, Plus, Loader2, LogIn, Coffee, Car, LogOut, Pencil } from 'lucide-react'
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

const EMPTY_FORM = {
  name: '', gender: 'male', speciality: '', slotDurationMin: '15', queueMode: 'hybrid', email: '', password: '',
}

export function DoctorsClient({ doctors }: { doctors: Doctor[] }) {
  const [list, setList] = useState(doctors)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [busyStatus, setBusyStatus] = useState<string | null>(null)

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
    })
    setEditId(d.id)
    setOpen(true)
  }

  async function save() {
    if (!form.name || !form.speciality) { toast.error('Name and speciality required'); return }
    setLoading(true)
    const payload: Record<string, unknown> = {
      name: form.name, gender: form.gender, speciality: form.speciality,
      slotDurationMin: Number(form.slotDurationMin), queueMode: form.queueMode,
      email: form.email || undefined, password: form.password || undefined,
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
              <DialogDescription>Doctor profile, slot settings, and optional login credentials.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
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
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)} aria-label="Edit">
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <Badge variant={STATUS_VARIANT[d.currentStatus] || 'outline'} className="capitalize">{d.currentStatus.replace('_', ' ')}</Badge>
                <span className="text-muted-foreground">{d._count.appointments} appts · {d.services.length} svc</span>
              </div>

              <div className="text-xs text-muted-foreground">{d.slotDurationMin}-min slots · {d.queueMode} queue</div>

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
