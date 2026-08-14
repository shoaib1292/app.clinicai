'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Activity, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Doctor { id: string; name: string; speciality: string }
interface Service {
  id: string
  name: string
  durationMin: number
  baseFee: number
  description: string | null
  active: boolean
  doctor: { id: string; name: string } | null
  _count: { appointments: number }
  createdAt: Date
}

const EMPTY_FORM = { name: '', durationMin: '15', baseFee: '0', doctorId: '', description: '' }

export function ServicesClient({ services, doctors }: { services: Service[]; doctors: Doctor[] }) {
  const [list, setList] = useState(services)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.name) { toast.error('Name required'); return }
    setLoading(true)
    const res = await fetch('/api/services', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        durationMin: Number(form.durationMin),
        baseFee: Number(form.baseFee),
        doctorId: form.doctorId || undefined,
        description: form.description || undefined,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Service created')
    setOpen(false)
    setForm(EMPTY_FORM)
    const fresh = await fetch('/api/services').then((r) => r.json())
    if (fresh.ok) setList(fresh.data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">{list.length} service{list.length !== 1 ? 's' : ''} · what patients book — fees, duration, doctor mapping</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Service</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Service</DialogTitle>
              <DialogDescription>Fees are in PKR. Patient pays base + platform fee.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Consultation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Base Fee (PKR)</Label>
                  <Input type="number" value={form.baseFee} onChange={(e) => setForm({ ...form, baseFee: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Doctor</Label>
                <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Any doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} — {d.speciality}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What's included in this service" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                Add Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.doctor?.name || 'Any doctor'}</div>
                </div>
                <Badge variant={s.active ? 'default' : 'secondary'} className="text-xs">{s.active ? 'Active' : 'Disabled'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <div><div className="text-foreground font-medium">{s.durationMin}m</div>Duration</div>
                <div><div className="text-foreground font-medium">PKR {s.baseFee}</div>Doctor fee</div>
              </div>
              {s.description && <div className="text-xs text-muted-foreground line-clamp-2">{s.description}</div>}
              <div className="text-xs text-muted-foreground">{s._count.appointments} appointment{s._count.appointments !== 1 ? 's' : ''} booked</div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">No services yet. Add one to start accepting bookings.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
