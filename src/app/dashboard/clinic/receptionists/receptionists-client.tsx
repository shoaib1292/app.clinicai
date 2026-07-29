'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UserCog, Plus, Loader2, Mail, Phone, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface Receptionist {
  id: string
  name: string
  email: string
  phone: string | null
  active: boolean
  createdAt: Date
}

const EMPTY_FORM = { name: '', email: '', password: '', phone: '' }

export function ReceptionistsClient({ receptionists }: { receptionists: Receptionist[] }) {
  const [list, setList] = useState(receptionists)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.name || !form.email || !form.password) { toast.error('Name, email, password required'); return }
    setLoading(true)
    const res = await fetch('/api/receptionists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone || undefined }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Receptionist added')
    setOpen(false)
    setForm(EMPTY_FORM)
    const fresh = await fetch('/api/receptionists').then((r) => r.json())
    if (fresh.ok) setList(fresh.data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Receptionists</h1>
          <p className="text-muted-foreground">{list.length} receptionist{list.length !== 1 ? 's' : ''} · staff who manage the queue and bookings</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Receptionist</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Receptionist</DialogTitle>
              <DialogDescription>Will be able to log in to the receptionist dashboard.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rehan Ali" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email (login)</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@clinic.pk" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCog className="w-4 h-4 mr-2" />}
                Add Receptionist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-semibold">
                  {r.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                {r.phone ? <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span> : <span />}
                <Badge variant={r.active ? 'default' : 'destructive'} className="text-xs">{r.active ? 'Active' : 'Disabled'}</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Joined {new Date(r.createdAt).toLocaleDateString('en-PK')}</div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">No receptionists yet. Add one to enable staff booking.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
