'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarDays, Stethoscope, Clock, User, Wallet, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Hash, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface Doctor {
  id: string
  name: string
  speciality: string
  slotDurationMin: number
  queueMode: string
}
interface Service {
  id: string
  name: string
  baseFee: number
  doctorId: string | null
}

interface Slot {
  id: string
  startTime: string
  endTime: string
  tokenNo: number | null
}

const STEPS = ['Doctor', 'Date', 'Slot', 'Patient', 'Payment', 'Confirm'] as const

export function BookClient({ doctors, services }: { doctors: Doctor[]; services: Service[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotId, setSlotId] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientGender, setPatientGender] = useState('unknown')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [submitting, setSubmitting] = useState(false)

  const doctor = doctors.find((d) => d.id === doctorId)
  const selectedSlot = slots.find((s) => s.id === slotId)
  const service = services.find((s) => s.doctorId === doctorId) || services[0]
  const fees = service
    ? { doctorFee: service.baseFee, platformFee: 50, total: service.baseFee + 50 }
    : null

  async function fetchSlots() {
    if (!doctorId || !date) return
    setLoadingSlots(true)
    setSlotId('')
    try {
      const res = await fetch(`/api/slots/available?doctorId=${doctorId}&date=${date}`)
      const json = await res.json()
      if (json.ok) {
        setSlots(json.data.slots)
        if (json.data.slots.length === 0) toast.info('No open slots for this date')
      } else {
        toast.error(json.error || 'Failed to load slots')
      }
    } finally {
      setLoadingSlots(false)
    }
  }

  async function submit() {
    if (!doctorId || !slotId || !patientPhone || !patientName) {
      toast.error('Missing required fields')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
          slotId,
          patientPhone,
          patientName,
          patientGender,
          serviceId: service?.id,
          channel: 'manual',
          paymentMode,
          createdVia: 'receptionist',
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Booking failed')
        return
      }
      toast.success('Appointment booked successfully')
      router.push('/dashboard/appointments')
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (step === 0 && !doctorId) { toast.error('Pick a doctor first'); return }
    if (step === 2 && !slotId) { toast.error('Pick a slot first'); return }
    if (step === 3 && (!patientName || !patientPhone)) { toast.error('Patient name and phone required'); return }
    if (step === 1) fetchSlots()
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Book Appointment</h1>
        <p className="text-muted-foreground">Manual booking for walk-in or phone patients</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${i === step ? 'bg-brand text-brand-foreground' : i < step ? 'bg-brand-soft text-brand' : 'bg-muted text-muted-foreground'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{i + 1}</span>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className="h-px bg-border flex-1 mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 0: Doctor */}
          {step === 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Stethoscope className="w-4 h-4" />Select Doctor</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDoctorId(d.id)}
                    className={`text-left p-3 rounded-md border transition-colors ${doctorId === d.id ? 'border-brand bg-brand-soft' : 'hover:bg-accent'}`}
                  >
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.speciality}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d.slotDurationMin}m slots · {d.queueMode} queue</div>
                  </button>
                ))}
              </div>
              {doctor && service && (
                <div className="p-3 rounded-md bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Default service:</span>{' '}
                  <span className="font-medium">{service.name}</span>{' '}
                  <Badge variant="outline" className="text-xs">PKR {service.baseFee}+50</Badge>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Date */}
          {step === 1 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Pick Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Slots will be generated from the doctor's working hours.</p>
            </div>
          )}

          {/* Step 2: Slot */}
          {step === 2 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Clock className="w-4 h-4" />Pick Slot</Label>
              {loadingSlots && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading slots…</div>}
              {!loadingSlots && slots.length === 0 && <div className="text-sm text-muted-foreground">No open slots for this date. Go back and pick another date.</div>}
              {!loadingSlots && slots.length > 0 && (
                <div className="max-h-96 overflow-y-auto scroll-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Token</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slots.map((s) => (
                        <TableRow key={s.id} className={slotId === s.id ? 'bg-brand-soft' : ''}>
                          <TableCell>{s.tokenNo ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-soft text-brand text-xs font-bold">{s.tokenNo}</span> : '—'}</TableCell>
                          <TableCell className="text-sm">{s.startTime}</TableCell>
                          <TableCell className="text-sm">{s.endTime}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant={slotId === s.id ? 'default' : 'outline'} onClick={() => setSlotId(s.id)}>
                              {slotId === s.id ? <><CheckCircle2 className="w-3 h-3 mr-1" />Selected</> : 'Select'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Patient */}
          {step === 3 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><User className="w-4 h-4" />Patient Details</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Ayesha Bibi" />
                </div>
                <div className="space-y-2">
                  <Label>Patient Phone</Label>
                  <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="+92..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={patientGender} onValueChange={setPatientGender} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem id="g-u" value="unknown" /><Label htmlFor="g-u" className="cursor-pointer font-normal">Prefer not to say</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem id="g-m" value="male" /><Label htmlFor="g-m" className="cursor-pointer font-normal">Male</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem id="g-f" value="female" /><Label htmlFor="g-f" className="cursor-pointer font-normal">Female</Label></div>
                </RadioGroup>
              </div>
              <p className="text-xs text-muted-foreground">If the phone matches an existing patient, their record will be reused.</p>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Wallet className="w-4 h-4" />Payment Mode</Label>
              <RadioGroup value={paymentMode} onValueChange={setPaymentMode} className="grid sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => setPaymentMode('cash')} className={`text-left p-3 rounded-md border ${paymentMode === 'cash' ? 'border-brand bg-brand-soft' : 'hover:bg-accent'}`}>
                  <div className="font-medium">Cash</div>
                  <div className="text-xs text-muted-foreground">Patient pays at the clinic. Mark as paid on check-in.</div>
                </button>
                <button type="button" onClick={() => setPaymentMode('online')} className={`text-left p-3 rounded-md border ${paymentMode === 'online' ? 'border-brand bg-brand-soft' : 'hover:bg-accent'}`}>
                  <div className="font-medium">Online</div>
                  <div className="text-xs text-muted-foreground">Patient uploads a transfer screenshot for receptionist to confirm.</div>
                </button>
              </RadioGroup>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Confirm Booking</Label>
              <div className="rounded-md border divide-y">
                <Row label="Doctor" value={doctor?.name} sub={doctor?.speciality} />
                <Row label="Date" value={date} />
                <Row label="Time" value={selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : '—'} sub={selectedSlot?.tokenNo ? `Token #${selectedSlot.tokenNo}` : undefined} />
                <Row label="Patient" value={patientName} sub={patientPhone} />
                <Row label="Payment" value={paymentMode === 'cash' ? 'Cash' : 'Online'} />
              </div>
              {fees && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Doctor fee</span><span>PKR {fees.doctorFee}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span>PKR {fees.platformFee}</span></div>
                    <div className="flex justify-between font-semibold pt-1 border-t mt-1"><span>Total</span><span>PKR {fees.total}</span></div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4 mr-1" />Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Next <ArrowRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Booking
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <MessageSquare className="w-3 h-3" />Patients can also book themselves via WhatsApp — your AI agent will handle it automatically.
      </div>
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value?: string | null; sub?: string }) {
  return (
    <div className="flex items-center justify-between p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className="text-sm font-medium">{value || '—'}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  )
}
