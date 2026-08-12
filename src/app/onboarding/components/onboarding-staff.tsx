'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Stethoscope, UserCog, Plus, X, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneField } from '@/components/ui/phone-field'

const SPECIALITIES = [
  'General Physician', 'Cardiologist', 'Dermatologist', 'ENT Specialist',
  'Gynecologist', 'Neurologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist',
  'Radiologist', 'Surgeon', 'Urologist', 'Dentist', 'Eye Specialist',
  'Physiotherapist', 'Nutritionist', 'Other',
]

type StaffMember =
  | { type: 'doctor'; name: string; gender: string; speciality: string; slotDuration: string; phone: string; email: string }
  | { type: 'receptionist'; name: string; phone: string; email: string }

interface Props {
  data: { staff: StaffMember[] }
  onChange: (patch: { staff: StaffMember[] }) => void
  clinicId: string
}

export function OnboardingStaff({ data, onChange, clinicId }: Props) {
  const [staffType, setStaffType] = useState<'doctor' | 'receptionist'>('doctor')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('male')
  const [speciality, setSpeciality] = useState('')
  const [slotDuration, setSlotDuration] = useState('15')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  async function addStaff() {
    if (!name) { toast.error('Name is required'); return }
    setAdding(true)

    if (staffType === 'doctor') {
      if (!speciality) { toast.error('Speciality required'); setAdding(false); return }
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, gender, speciality, slotDurationMin: Number(slotDuration),
          phone: phone || undefined, email: email || undefined, clinicId,
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed'); setAdding(false); return }
    } else {
      if (!email) { toast.error('Email required for receptionist'); setAdding(false); return }
      const res = await fetch('/api/receptionists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, clinicId }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed'); setAdding(false); return }
    }

    const member: StaffMember = staffType === 'doctor'
      ? { type: 'doctor', name, gender, speciality, slotDuration, phone, email }
      : { type: 'receptionist', name, phone, email }

    onChange({ staff: [...data.staff, member] })
    setName(''); setSpeciality(''); setPhone(''); setEmail('')
    toast.success(`${staffType === 'doctor' ? 'Doctor' : 'Receptionist'} added`)
    setAdding(false)
  }

  function removeStaff(index: number) {
    onChange({ staff: data.staff.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Add Your Staff</h2>
        <p className="text-muted-foreground text-sm">
          Add doctors and receptionists who work at your clinic. You can always add more later.
        </p>
      </div>

      {/* Add form */}
      <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={staffType === 'doctor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStaffType('doctor')}
            >
              <Stethoscope className="size-3.5 mr-1" /> Doctor
            </Button>
            <Button
              variant={staffType === 'receptionist' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStaffType('receptionist')}
            >
              <UserCog className="size-3.5 mr-1" /> Receptionist
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={staffType === 'doctor' ? 'Dr. Ali' : 'Sara Ahmed'} />
          </div>
          {staffType === 'doctor' ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Speciality</Label>
                <Select value={speciality} onValueChange={setSpeciality}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {SPECIALITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slot (min)</Label>
                <Select value={slotDuration} onValueChange={setSlotDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['5', '10', '15', '20', '30'].map((v) => <SelectItem key={v} value={v}>{v}m</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <PhoneField value={phone} onChange={setPhone} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
        </div>

        <Button onClick={addStaff} disabled={adding || !name} size="sm" className="mt-2">
          {adding ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
          Add {staffType === 'doctor' ? 'Doctor' : 'Receptionist'}
        </Button>
      </div>

      {/* Staff list */}
      {data.staff.length > 0 && (
        <div className="space-y-2">
          {data.staff.map((s, i) => (
            <div key={`${s.type}-${i}`} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Badge variant={s.type === 'doctor' ? 'default' : 'secondary'} className="gap-1">
                  {s.type === 'doctor' ? <Stethoscope className="size-3" /> : <UserCog className="size-3" />}
                  {s.type === 'doctor' ? 'Doctor' : 'Receptionist'}
                </Badge>
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.type === 'doctor' ? `${s.speciality}` : ''}
                    {s.email ? ` · ${s.email}` : ''}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => removeStaff(i)}>
                <X className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.staff.length === 0 && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          No staff added yet. You can skip this and add later from Settings.
        </p>
      )}
    </div>
  )
}
