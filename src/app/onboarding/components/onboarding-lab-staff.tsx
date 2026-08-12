'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { UserCog, Plus, X, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneField } from '@/components/ui/phone-field'

interface StaffMember {
  type: 'lab_technician'
  name: string
  phone: string
  email: string
}

interface Props {
  data: { labStaff: StaffMember[] }
  onChange: (patch: { labStaff: StaffMember[] }) => void
  clinicId: string
}

export function OnboardingLabStaff({ data, onChange, clinicId }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  async function addLabStaff() {
    if (!name || !email) { toast.error('Name and email required'); return }
    setAdding(true)
    try {
      const res = await fetch('/api/lab-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, clinicId }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed'); setAdding(false); return }
      onChange({ labStaff: [...data.labStaff, { type: 'lab_technician', name, phone, email }] })
      setName(''); setPhone(''); setEmail('')
      toast.success('Lab staff added')
    } catch {
      toast.error('Something went wrong')
    }
    setAdding(false)
  }

  function removeStaff(index: number) {
    onChange({ labStaff: data.labStaff.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Add Lab Staff</h2>
        <p className="text-muted-foreground text-sm">
          Add lab technicians who will manage lab orders and reports. You can always add more later from Settings.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Raza" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <PhoneField value={phone} onChange={setPhone} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>
          <Button onClick={addLabStaff} disabled={adding || !name} size="sm">
            {adding ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <UserCog className="size-3.5 mr-1" />}
            Add Lab Technician
          </Button>
        </CardContent>
      </Card>

      {data.labStaff.length > 0 && (
        <div className="space-y-2">
          {data.labStaff.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <UserCog className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.email}{s.phone ? ` · ${s.phone}` : ''}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => removeStaff(i)}>
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.labStaff.length === 0 && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          No lab staff added yet. You can skip this and add later from Settings.
        </p>
      )}
    </div>
  )
}
