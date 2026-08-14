'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Stethoscope, UserCog, Pill, FlaskConical, Wallet, Plus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Doctor { id: string; name: string; email: string | null; speciality: string; active: boolean; currentStatus: string }
interface Staff { id: string; name: string; email: string | null; active: boolean }

interface Props {
  clinicId: string
  doctors: Doctor[]
  receptionists: Staff[]
  pharmacists: Staff[]
  labAdmins: Staff[]
  accountants: Staff[]
}

type RoleKey = 'receptionists' | 'pharmacists' | 'labAdmins' | 'accountants'

const ROLE_META: Record<RoleKey, { apiPath: string; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  receptionists: { apiPath: '/api/receptionists', label: 'Receptionist', description: 'Handles patient check-in, bookings, and the live queue.', icon: UserCog },
  pharmacists: { apiPath: '/api/pharmacists', label: 'Pharmacist', description: 'Runs the pharmacy counter and manages medicines.', icon: Pill },
  labAdmins: { apiPath: '/api/lab-admins', label: 'Lab Admin', description: 'Manages lab tests, orders, and reports.', icon: FlaskConical },
  accountants: { apiPath: '/api/accountants', label: 'Accountant', description: 'Handles payments, billing, and the credit ledger.', icon: Wallet },
}

function StaffTable({ staff, onToggleActive, onDelete, togglingId, columns }: { staff: Staff[]; onToggleActive?: (s: Staff) => void; onDelete?: (s: Staff) => void; togglingId?: string | null; columns: string[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => <TableHead key={c}>{c}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id} className={s.active ? '' : 'opacity-50'}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell className="text-xs">{s.email || '—'}</TableCell>
            <TableCell><Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Active' : 'Inactive'}</Badge></TableCell>
            {(onToggleActive || onDelete) && (
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {togglingId === s.id && <Loader2 className="size-3.5 animate-spin" />}
                  {onToggleActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onToggleActive(s)}
                      disabled={!s.email || togglingId === s.id}
                      title={!s.email ? 'Cannot deactivate a member without an account' : 'Toggle active'}
                    >
                      {s.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDelete(s)}
                      disabled={togglingId === s.id}
                      title={`Remove ${s.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
        {staff.length === 0 && (
          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No staff added yet — use &quot;Add {columns[0].toLowerCase()}&quot; to create one.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export function StaffManagementClient({ doctors, receptionists, pharmacists, labAdmins, accountants }: Props) {
  const [lists, setLists] = useState({ receptionists, pharmacists, labAdmins, accountants })
  const [activeRole, setActiveRole] = useState<RoleKey>('receptionists')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const total = doctors.length + lists.receptionists.length + lists.pharmacists.length + lists.labAdmins.length + lists.accountants.length

  function openAdd(role: RoleKey) {
    setActiveRole(role)
    setForm({ name: '', email: '', phone: '' })
    setOpen(true)
  }

  async function addMember() {
    const meta = ROLE_META[activeRole]
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.email.trim()) { toast.error('Email is required'); return }
    setSaving(true)
    try {
      const res = await fetch(meta.apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || `Failed to add ${meta.label.toLowerCase()}`)
        return
      }
      const created = json.data as Staff
      setLists((prev) => ({ ...prev, [activeRole]: [created, ...prev[activeRole]] }))
      setOpen(false)
      toast.success(`${meta.label} added — invite email sent`)
    } catch {
      toast.error(`Network error — ${meta.label.toLowerCase()} not added`)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(role: RoleKey, s: Staff) {
    setTogglingId(s.id)
    try {
      const res = await fetch(`${ROLE_META[role].apiPath}/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !s.active }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed to update'); return }
      setLists((prev) => ({
        ...prev,
        [role]: prev[role].map((m) => (m.id === s.id ? { ...m, active: !s.active } : m)),
      }))
      toast.success(s.active ? 'Member deactivated' : 'Member activated')
    } catch {
      toast.error('Network error — update failed')
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteMember(role: RoleKey, s: Staff) {
    if (!confirm(`Remove ${s.name}? They will lose access to the dashboard immediately.`)) return
    try {
      const res = await fetch(`${ROLE_META[role].apiPath}/${s.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed to remove'); return }
      setLists((prev) => ({
        ...prev,
        [role]: prev[role].filter((m) => m.id !== s.id),
      }))
      toast.success(`${s.name} removed`)
    } catch {
      toast.error('Network error — member not removed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Staff Management</h1>
        <p className="text-muted-foreground">View and manage all clinic staff — {total} total</p>
      </div>

      <Tabs defaultValue="doctors" onValueChange={(v) => { if (v !== 'doctors') setActiveRole(v as RoleKey) }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="doctors"><Stethoscope className="size-3.5 mr-1" /> Doctors ({doctors.length})</TabsTrigger>
          <TabsTrigger value="receptionists"><UserCog className="size-3.5 mr-1" /> Receptionists ({lists.receptionists.length})</TabsTrigger>
          <TabsTrigger value="pharmacists"><Pill className="size-3.5 mr-1" /> Pharmacists ({lists.pharmacists.length})</TabsTrigger>
          <TabsTrigger value="labAdmins"><FlaskConical className="size-3.5 mr-1" /> Lab Admins ({lists.labAdmins.length})</TabsTrigger>
          <TabsTrigger value="accountants"><Wallet className="size-3.5 mr-1" /> Accountants ({lists.accountants.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Doctors ({doctors.length})</CardTitle>
              <CardDescription>Doctors are created from the Doctors page under Settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Speciality</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map(d => (
                    <TableRow key={d.id} className={d.active ? '' : 'opacity-50'}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-xs">{d.email || '—'}</TableCell>
                      <TableCell>{d.speciality}</TableCell>
                      <TableCell><Badge variant={d.active ? 'default' : 'secondary'}>{d.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{d.currentStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {(Object.keys(ROLE_META) as RoleKey[]).map((role) => {
          const meta = ROLE_META[role]
          const Icon = meta.icon
          const staff = lists[role]
          return (
            <TabsContent key={role} value={role}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {meta.label}s ({staff.length})</CardTitle>
                    <CardDescription>{meta.description}</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => openAdd(role)}>
                    <Plus className="size-3.5 mr-1" /> Add {meta.label}
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <StaffTable
                    staff={staff}
                    columns={['Name', 'Email', 'Status']}
                    onToggleActive={(s) => toggleActive(role, s)}
                    onDelete={(s) => deleteMember(role, s)}
                    togglingId={togglingId}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Add staff dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {ROLE_META[activeRole]?.label}</DialogTitle>
            <DialogDescription>They&apos;ll receive an invite email to set their password and sign in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed Khan" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ahmed@clinic.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 1234567" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addMember} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
              Add {ROLE_META[activeRole]?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
