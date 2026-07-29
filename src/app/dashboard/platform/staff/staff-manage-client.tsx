'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UserCog, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  roleLabel?: string
  scopes: string[]
  active?: boolean
  twoFactorEnabled?: boolean
  createdAt: Date
}

const ROLES = [
  { value: 'sales', label: 'Sales' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'support', label: 'Support' },
  { value: 'finance', label: 'Finance' },
]

const ROLE_SCOPE_MAP: Record<string, string[]> = {
  sales: ['view_clinics', 'convert_leads', 'book_platform_appointments'],
  onboarding: ['provision_clinic', 'setup_whatsapp', 'seed_doctors', 'manage_schedules'],
  support: ['read_clinic_config', 'read_conversations', 'write_audit'],
  finance: ['view_invoices', 'view_ledger', 'confirm_payments', 'reject_payments', 'trigger_settlement'],
}

interface Props {
  admins: StaffMember[]
  staff: StaffMember[]
}

export function StaffManageClient({ admins, staff: initialStaff }: Props) {
  const router = useRouter()
  const [staff, setStaff] = useState(initialStaff)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales' })

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) { toast.error('All fields required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/platform/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed to create'); return }
      toast.success('Staff member created')
      setStaff((prev) => [...prev, json.data])
      setOpen(false)
      setForm({ name: '', email: '', password: '', role: 'sales' })
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this staff member?')) return
    try {
      const res = await fetch('/api/platform/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed to remove'); return }
      toast.success('Staff member removed')
      setStaff((prev) => prev.filter((s) => s.id !== id))
      router.refresh()
    } catch {
      toast.error('Network error')
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const res = await fetch('/api/platform/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed to update'); return }
      setStaff((prev) => prev.map((s) => s.id === id ? { ...s, active: !active } : s))
      toast.success(active ? 'Staff disabled' : 'Staff enabled')
      router.refresh()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Platform Staff</h1>
          <p className="text-muted-foreground">Scoped access control — sales, onboarding, support, finance</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Platform Staff</DialogTitle>
              <DialogDescription>Create a scoped staff account. They will log in with these credentials.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Staff name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@clinicai.app" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ROLE_SCOPE_MAP[form.role] && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Scopes: {ROLE_SCOPE_MAP[form.role].join(', ')}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Admins (2FA mandatory)</CardTitle>
          <CardDescription>Super-admins with full access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-semibold">{a.name.charAt(0)}</div>
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="capitalize">{a.role.replace('_', ' ')}</Badge>
                {a.twoFactorEnabled && <Badge variant="secondary" className="text-xs">2FA</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Staff ({staff.length})</CardTitle>
          <CardDescription>Scoped staff — each role has limited access. Click to enable/disable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-md border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><UserCog className="size-4" /></div>
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                  <div className="text-xs text-muted-foreground">Scopes: {s.scopes.join(', ') || 'none'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{s.role}</Badge>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(s.id, !!s.active)}>
                  <Badge variant={s.active ? 'default' : 'destructive'} className="text-xs cursor-pointer">{s.active ? 'Active' : 'Disabled'}</Badge>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No platform staff yet. Add one to get started.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Scope Matrix</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-muted/40"><strong>Sales:</strong> View onboarding clinics, convert leads, book platform appointments, no patient data access</div>
            <div className="p-2 rounded-md bg-muted/40"><strong>Onboarding:</strong> Provision clinic, assist QR/Meta setup, seed doctors/schedules, hand off</div>
            <div className="p-2 rounded-md bg-muted/40"><strong>Support:</strong> Read-only access to clinic configs & conversations for debugging; writes require audit</div>
            <div className="p-2 rounded-md bg-muted/40"><strong>Finance:</strong> View invoices, credit ledgers, confirm/reject payment proofs, trigger settlement, reconcile Meta costs</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
