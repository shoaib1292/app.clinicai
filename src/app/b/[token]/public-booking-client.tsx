'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, Clock, CheckCircle2, Loader2, Stethoscope, ArrowRight, ArrowLeft, Phone, User } from 'lucide-react'
import { toast } from 'sonner'

interface Clinic { id: string; name: string; city: string | null; agentName: string; onlinePaymentsEnabled: boolean }
interface Service { id: string; name: string; baseFee: number; extraClinicFee: number; durationMin: number }
interface Doctor {
  id: string; name: string; speciality: string; gender: string; slotDurationMin: number; queueMode: string
  services: Service[]
}

interface Slot { id: string; startTime: string; endTime: string; tokenNo: number | null }

export function PublicBookingClient({
  clinic, doctors, services, preselectedDoctorId, preselectedServiceId
}: {
  clinic: Clinic; doctors: Doctor[]; services: Service[]
  preselectedDoctorId: string; preselectedServiceId: string
}) {
  const [step, setStep] = useState<'doctor' | 'date' | 'slot' | 'patient' | 'confirm' | 'done'>(preselectedDoctorId ? 'date' : 'doctor')
  const [doctorId, setDoctorId] = useState(preselectedDoctorId || '')
  const [serviceId, setServiceId] = useState(preselectedServiceId || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotId, setSlotId] = useState('')
  const [patient, setPatient] = useState({ name: '', phone: '', gender: 'unknown' })
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash')
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState<{ id: string; token: number | null; time: string; fees: { total: number } } | null>(null)

  const selectedDoctor = doctors.find((d) => d.id === doctorId)
  const selectedService = selectedDoctor?.services.find((s) => s.id === serviceId) || services.find((s) => s.id === serviceId)
  const platformFee = 50
  const totalFee = (selectedService?.baseFee || 0) + (selectedService?.extraClinicFee || 0) + platformFee

  async function fetchSlots() {
    setLoading(true)
    const res = await fetch(`/api/public/slots?doctorId=${doctorId}&date=${date}`)
    const json = await res.json()
    setLoading(false)
    if (json.ok) setSlots(json.data.slots)
  }

  useEffect(() => {
    if (doctorId && step === 'date') {
      let cancelled = false
      const t = setTimeout(() => {
        if (cancelled) return
        fetchSlots()
      }, 0)
      return () => { cancelled = true; clearTimeout(t) }
    }
  }, [doctorId, date, step])

  async function book() {
    setLoading(true)
    const res = await fetch('/api/public/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        slotId,
        patientPhone: patient.phone,
        patientName: patient.name,
        patientGender: patient.gender,
        serviceId,
        channel: 'link',
        paymentMode,
        createdVia: 'link',
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.ok) {
      setBooking({
        id: json.data.appointmentId,
        token: json.data.slot?.tokenNo ?? null,
        time: json.data.slot?.startTime ?? '',
        fees: json.data.fees,
      })
      setStep('done')
      toast.success('Appointment booked!')
    } else {
      toast.error(json.error || 'Booking failed')
    }
  }

  if (step === 'done' && booking) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-chart-2" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Appointment Confirmed!</h1>
            <p className="text-muted-foreground mb-6">{clinic.name}</p>

            <div className="space-y-2 text-left bg-muted/40 rounded-lg p-4 mb-6">
              <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span className="font-medium">{selectedDoctor?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(date).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{booking.time}</span></div>
              {booking.token && <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span className="font-medium">#{booking.token}</span></div>}
              <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted-foreground">Total Fee</span><span className="font-bold">PKR {booking.fees.total}</span></div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {paymentMode === 'cash'
                ? 'Please pay PKR ' + booking.fees.total + ' at the clinic counter.'
                : 'Please transfer PKR ' + booking.fees.total + ' and upload the screenshot on WhatsApp.'}
            </p>
            <p className="text-xs text-muted-foreground">
              A reminder will be sent before your appointment. If you need to cancel or reschedule, please contact the clinic.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-gradient p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-6 h-6 text-brand-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
          <p className="text-muted-foreground">{clinic.city} · Book your appointment</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['doctor', 'date', 'slot', 'patient', 'confirm'].map((s, i) => {
            const idx = ['doctor', 'date', 'slot', 'patient', 'confirm'].indexOf(step)
            const active = i <= idx
            return (
              <div key={s} className={`h-1.5 rounded-full transition-all ${active ? 'bg-brand w-12' : 'bg-muted w-6'}`} />
            )
          })}
        </div>

        <Card className="glass-card">
          <CardContent className="p-6">
            {/* Step 1: Doctor */}
            {step === 'doctor' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Select Doctor</h2>
                  <p className="text-sm text-muted-foreground">Choose a doctor to see available slots</p>
                </div>
                <div className="space-y-2">
                  {doctors.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setDoctorId(d.id); setStep('date') }}
                      className="w-full text-left p-4 rounded-lg border hover:border-brand hover:bg-accent/40 hover:shadow-sm transition-all flex items-center gap-3"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${d.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-cyan-100 text-cyan-700'}`}>
                        {d.name.charAt(4) || d.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.speciality}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Date */}
            {step === 'date' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Select Date</h2>
                  {!preselectedDoctorId && (
                    <Button variant="ghost" size="sm" onClick={() => setStep('doctor')}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlotId('') }} />
                </div>
                <Button className="w-full" onClick={() => setStep('slot')} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-2" />}
                  Check Availability
                </Button>
              </div>
            )}

            {/* Step 3: Slot */}
            {step === 'slot' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Available Slots</h2>
                  <Button variant="ghost" size="sm" onClick={() => setStep('date')}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(date).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })} · {selectedDoctor?.name}</p>
                {loading && <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
                {!loading && slots.length === 0 && <div className="text-center py-8 text-muted-foreground">No slots available. Try another date.</div>}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSlotId(s.id); setStep('patient') }}
                      className={`p-3 rounded-lg border text-center hover:border-brand hover:bg-accent/40 transition-colors ${slotId === s.id ? 'border-brand bg-brand/10' : ''}`}
                    >
                      <div className="text-sm font-medium">{s.startTime}</div>
                      {s.tokenNo && <div className="text-xs text-muted-foreground">Token {s.tokenNo}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Patient */}
            {step === 'patient' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Your Details</h2>
                  <Button variant="ghost" size="sm" onClick={() => setStep('slot')}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-8" placeholder="Ahmed Raza" value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-8" placeholder="+92 300 1234567" value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={patient.gender} onValueChange={(v) => setPatient({ ...patient, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="unknown">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setStep('confirm')} disabled={!patient.name || !patient.phone}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 5: Confirm */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Confirm Booking</h2>
                  <Button variant="ghost" size="sm" onClick={() => setStep('patient')}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
                </div>

                <div className="space-y-2 bg-muted/40 rounded-lg p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span className="font-medium">{selectedDoctor?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(date).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{slots.find((s) => s.id === slotId)?.startTime}</span></div>
                  {slots.find((s) => s.id === slotId)?.tokenNo && <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span className="font-medium">#{slots.find((s) => s.id === slotId)?.tokenNo}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{patient.name}</span></div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Doctor fee</span><span>PKR {selectedService?.baseFee || 0}</span></div>
                  <div className="flex justify-between text-sm"><span>Extra clinic fee</span><span>PKR {selectedService?.extraClinicFee || 0}</span></div>
                  <div className="flex justify-between text-sm"><span>Platform fee</span><span>PKR {platformFee}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>PKR {totalFee}</span></div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentMode('cash')} className={`p-3 rounded-lg border text-center ${paymentMode === 'cash' ? 'border-brand bg-brand/10' : ''}`}>
                      <div className="text-sm font-medium">Cash</div>
                      <div className="text-xs text-muted-foreground">Pay at clinic</div>
                    </button>
                    <button onClick={() => setPaymentMode('online')} disabled={!clinic.onlinePaymentsEnabled} className={`p-3 rounded-lg border text-center ${paymentMode === 'online' ? 'border-brand bg-brand/10' : ''} ${!clinic.onlinePaymentsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="text-sm font-medium">Online</div>
                      <div className="text-xs text-muted-foreground">{clinic.onlinePaymentsEnabled ? 'Transfer + screenshot' : 'Not available'}</div>
                    </button>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={book} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirm Booking
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By confirming, you agree to the clinic's cancellation policy. Full refund if cancelled 4+ hours before.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by ClinicAI · 24/7 AI receptionist for Pakistani clinics
        </p>
      </div>
    </div>
  )
}
