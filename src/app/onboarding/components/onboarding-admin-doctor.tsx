'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Stethoscope, Upload, Check } from 'lucide-react'
import { toast } from 'sonner'

const SPECIALITIES = [
  'General Physician', 'Cardiologist', 'Dermatologist', 'ENT Specialist',
  'Gynecologist', 'Neurologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist',
  'Radiologist', 'Surgeon', 'Urologist', 'Dentist', 'Eye Specialist',
  'Physiotherapist', 'Nutritionist', 'Other',
]

interface Props {
  data: { isDoctor: boolean; doctorId: string | null }
  onChange: (patch: Partial<Props['data']>) => void
  clinicId: string
}

export function OnboardingAdminAsDoctor({ data, onChange, clinicId }: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<string>('male')
  const [speciality, setSpeciality] = useState('')
  const [slotDuration, setSlotDuration] = useState('15')
  const [qualifications, setQualifications] = useState('')
  const [bio, setBio] = useState('')
  const [telemedicine, setTelemedicine] = useState(false)
  const [telemedicineFee, setTelemedicineFee] = useState('500')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!data.doctorId)

  async function saveDoctor() {
    if (!name || !speciality) {
      toast.error('Name and speciality are required')
      return
    }
    setSaving(true)
    const res = await fetch('/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        gender,
        speciality,
        slotDurationMin: Number(slotDuration),
        qualifications: qualifications || undefined,
        bio: bio || undefined,
        canTelemedicine: telemedicine,
        telemedicineFee: telemedicine ? Number(telemedicineFee) : 0,
        clinicId,
      }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); setSaving(false); return }

    onChange({ doctorId: json.data.id, isDoctor: true })
    setSaved(true)
    toast.success('Doctor profile saved')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Are You Also a Doctor Here?</h2>
        <p className="text-muted-foreground text-sm">
          If you're the doctor at this clinic, add your profile here. Your patients will be able to book online.
        </p>
      </div>

      {!saved ? (
        <>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <div className="font-medium">I see patients at this clinic</div>
              <div className="text-sm text-muted-foreground">Add your doctor profile for online bookings</div>
            </div>
            <Switch
              checked={data.isDoctor}
              onCheckedChange={(v) => onChange({ isDoctor: v, doctorId: null })}
            />
          </div>

          {data.isDoctor && (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Sarah Khan" />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="male" /><Label className="text-sm font-normal">Male</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="female" /><Label className="text-sm font-normal">Female</Label></div>
                  </RadioGroup>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Speciality</Label>
                  <Select value={speciality} onValueChange={setSpeciality}>
                    <SelectTrigger><SelectValue placeholder="Select speciality" /></SelectTrigger>
                    <SelectContent>
                      {SPECIALITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Slot Duration (min)</Label>
                  <Select value={slotDuration} onValueChange={setSlotDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['5', '10', '15', '20', '30', '45', '60'].map((v) => (
                        <SelectItem key={v} value={v}>{v} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Qualifications</Label>
                <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="MBBS, FCPS (Cardiology)" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief introduction..." rows={3} />
              </div>
              <div className="space-y-4 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Video Consultation</div>
                    <div className="text-xs text-muted-foreground">Enable online video appointments</div>
                  </div>
                  <Switch checked={telemedicine} onCheckedChange={setTelemedicine} />
                </div>
                {telemedicine && (
                  <div className="space-y-2">
                    <Label>Telemedicine Fee (PKR)</Label>
                    <Input type="number" value={telemedicineFee} onChange={(e) => setTelemedicineFee(e.target.value)} />
                  </div>
                )}
              </div>
              <Button onClick={saveDoctor} disabled={saving} className="w-full">
                <Stethoscope className="size-4 mr-1.5" />
                {saving ? 'Saving...' : 'Save Doctor Profile'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border p-4 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
          <Check className="size-5 text-emerald-600" />
          <div>
            <div className="font-medium">Doctor profile added</div>
            <div className="text-sm text-muted-foreground">{name} — {speciality}</div>
          </div>
        </div>
      )}

      {!data.isDoctor && (
        <p className="text-center text-sm text-muted-foreground pt-4">
          No problem — you can add doctors later from Settings &gt; Doctors.
        </p>
      )}
    </div>
  )
}
