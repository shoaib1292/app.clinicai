'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppointmentScheduler } from '@/components/ui/appointment-scheduler'
import type { TimeSlot, AvailableDate } from '@/components/ui/appointment-scheduler'
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft, Phone, User, Stethoscope, Tag, Share2, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Clinic { id: string; name: string; city: string | null; agentName: string; onlinePaymentsEnabled: boolean }
interface Service { id: string; name: string; baseFee: number; extraClinicFee: number; durationMin: number }
interface Doctor {
  id: string; name: string; speciality: string; gender: string; slotDurationMin: number; queueMode: string
  services: Service[]
}

export function PublicBookingClient({
  clinic, doctors, services, preselectedDoctorId, preselectedServiceId, initialRefCode
}: {
  clinic: Clinic; doctors: Doctor[]; services: Service[]
  preselectedDoctorId: string; preselectedServiceId: string
  initialRefCode?: string
}) {
  const [step, setStep] = useState<'doctor' | 'schedule' | 'details' | 'confirm' | 'done'>(
    preselectedDoctorId ? 'schedule' : 'doctor'
  )
  const [doctorId, setDoctorId] = useState(preselectedDoctorId || '')
  const [serviceId, setServiceId] = useState(preselectedServiceId || '')
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [availability, setAvailability] = useState<AvailableDate[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [slotIdMap, setSlotIdMap] = useState<Record<string, string>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [patient, setPatient] = useState({ name: '', phone: '', gender: 'unknown' })
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash')
  const [booking, setBooking] = useState(false)
  const [bookingResult, setBookingResult] = useState<{ id: string; token: number | null; time: string; fees: { total: number; discount?: number } } | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [refCode, setRefCode] = useState(initialRefCode || '')
  const [appliedDiscount, setAppliedDiscount] = useState<{ amount: number; title?: string } | null>(null)
  const [validatingCode, setValidatingCode] = useState(false)
  const [referralLink, setReferralLink] = useState('')

  const selectedDoctor = doctors.find((d) => d.id === doctorId)
  const allDoctorServices = selectedDoctor?.services || services
  const selectedService = allDoctorServices.find((s) => s.id === serviceId)
  const platformFee = 50
  const doctorFee = selectedService?.baseFee ?? 0
  const extraFee = selectedService?.extraClinicFee ?? 0
  const discountAmount = appliedDiscount?.amount ?? 0
  const totalFee = Math.max(0, doctorFee + extraFee + platformFee - discountAmount)

  // Fetch month availability for calendar dots
  const fetchAvailability = useCallback(async (month: number, year: number) => {
    if (!doctorId) return
    setLoadingAvail(true)
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    const res = await fetch(`/api/public/availability?doctorId=${doctorId}&month=${monthStr}${serviceId ? `&serviceId=${serviceId}` : ''}`)
    const json = await res.json()
    setLoadingAvail(false)
    if (json.ok) {
      setAvailability(json.data || [])
    }
  }, [doctorId, serviceId])

  // Fetch slots for selected date
  const fetchSlotsForDate = useCallback(async (day: number) => {
    if (!doctorId) return
    setLoadingSlots(true)
    setTimeSlots([])
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const res = await fetch(`/api/public/slots?doctorId=${doctorId}&date=${dateStr}`)
    const json = await res.json()
    setLoadingSlots(false)
    if (json.ok) {
      const slots = (json.data?.slots || []).map((s: { id: string; startTime: string; endTime: string; tokenNo: number | null }) => ({
        time: s.startTime,
        available: true,
        token: s.tokenNo,
        label: s.startTime,
      }))
      const idMap: Record<string, string> = {}
      for (const s of json.data?.slots || []) idMap[s.startTime] = s.id
      setSlotIdMap(idMap)
      setTimeSlots(slots)
    } else {
      setTimeSlots([])
    }
  }, [doctorId, selectedMonth, selectedYear])

  useEffect(() => {
    fetchAvailability(selectedMonth, selectedYear)
  }, [selectedMonth, selectedYear, fetchAvailability])

  function handleDateSelect(day: number) {
    setSelectedDate(day)
    setSelectedTime(null)
    fetchSlotsForDate(day)
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time)
  }

  function handleMonthChange(month: number, year: number) {
    setSelectedMonth(month)
    setSelectedYear(year)
    setSelectedDate(null)
    setSelectedTime(null)
    setTimeSlots([])
  }

  function handleContinueToDetails() {
    setStep('details')
  }

  async function handleValidateCode() {
    if (!promoCode.trim()) return
    setValidatingCode(true)
    const res = await fetch('/api/offers/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode.trim(), clinicId: clinic.id }),
    })
    const json = await res.json()
    setValidatingCode(false)
    if (json.ok && json.discountAmount) {
      setAppliedDiscount({ amount: json.discountAmount, title: json.offer?.title })
      toast.success(`${json.offer?.title || 'Discount'} applied!`)
    } else {
      setAppliedDiscount(null)
      toast.error(json.error || 'Invalid code')
    }
  }

  async function handleBook() {
    setBooking(true)
    const slotId = selectedTime ? slotIdMap[selectedTime] : ''
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
        paymentMode,
        promoCode: promoCode.trim() || undefined,
        refCode: refCode.trim() || undefined,
      }),
    })
    const json = await res.json()
    setBooking(false)
    if (json.ok) {
      setBookingResult({
        id: json.data.appointmentId,
        token: json.data.slot?.tokenNo ?? null,
        time: json.data.slot?.startTime ?? selectedTime ?? '',
        fees: json.data.fees,
      })
      setStep('done')
      toast.success('Appointment booked!')
    } else {
      toast.error(json.error || 'Booking failed')
    }
  }

  function formatDate(day: number, month: number, year: number) {
    return new Date(year, month, day).toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  // ---- DONE SCREEN ----
  if (step === 'done' && bookingResult) {
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
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{selectedDate ? formatDate(selectedDate, selectedMonth, selectedYear) : ''}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{bookingResult.time}</span></div>
              {bookingResult.token && <div className="flex justify-between"><span className="text-muted-foreground">Token</span><span className="font-medium">#{bookingResult.token}</span></div>}
              <div className="flex justify-between border-t pt-2 mt-2"><span className="text-muted-foreground">Total Fee</span><span className="font-bold">PKR {bookingResult.fees.total}</span></div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {paymentMode === 'cash'
                ? `Please pay PKR ${bookingResult.fees.total} at the clinic counter.`
                : `Please transfer PKR ${bookingResult.fees.total} and upload the screenshot on WhatsApp.`}
            </p>
            <p className="text-xs text-muted-foreground">
              A reminder will be sent before your appointment. If you need to cancel or reschedule, please contact the clinic.
            </p>

            {/* Referral Share Card */}
            <div className="mt-6 pt-4 border-t text-left">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-4 h-4 text-brand" />
                <span className="font-medium text-sm">Refer a Friend & Earn</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Share your referral link — when they book & complete an appointment, you both earn rewards!
              </p>
              <div className="flex gap-2">
                <Input readOnly value={referralLink || 'Loading your referral link...'} className="text-xs font-mono" />
                <Button variant="outline" size="icon" className="shrink-0"
                  onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Link copied!') }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {referralLink && (
                <a href={`https://wa.me/?text=${encodeURIComponent('Book your appointment at ' + clinic.name + ': ' + referralLink)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 text-xs text-chart-2 mt-2 hover:underline">
                  <Share2 className="w-3 h-3" /> Share on WhatsApp
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- DOCTOR SELECT SCREEN ----
  if (step === 'doctor') {
    return (
      <div className="min-h-screen hero-gradient p-4">
        <div className="max-w-xl mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="w-6 h-6 text-brand-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{clinic.name}</h1>
            <p className="text-muted-foreground">{clinic.city} · Book your appointment</p>
          </div>

          <Card className="glass-card">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-1">Select Doctor</h2>
              <p className="text-sm text-muted-foreground mb-4">Choose a doctor to see available slots</p>
              <div className="space-y-2">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setDoctorId(d.id); setStep('schedule') }}
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
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Powered by ClinicAI · 24/7 AI receptionist for Pakistani clinics
          </p>
        </div>
      </div>
    )
  }

  // ---- SCHEDULE SCREEN (Calendar + Slots) ----
  if (step === 'schedule') {
    return (
      <div className="min-h-screen hero-gradient p-4">
        <div className="max-w-5xl mx-auto py-4">
          {!preselectedDoctorId && doctors.length > 1 && (
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => { setStep('doctor'); setSelectedDate(null); setSelectedTime(null) }}>
                <ArrowLeft className="w-4 h-4 mr-1" />Change Doctor
              </Button>
            </div>
          )}

          <AppointmentScheduler
            providerName={clinic.name}
            providerLocation={clinic.city ?? undefined}
            showHeader
            year={selectedYear}
            month={selectedMonth}
            availableDates={availability}
            timeSlots={timeSlots}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            loading={loadingSlots || loadingAvail}
            onDateSelect={handleDateSelect}
            onTimeSelect={handleTimeSelect}
            onMonthChange={handleMonthChange}
            onBook={handleContinueToDetails}
          />
        </div>
      </div>
    )
  }

  // ---- PATIENT DETAILS SCREEN ----
  if (step === 'details') {
    return (
      <div className="min-h-screen hero-gradient p-4">
        <div className="max-w-xl mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="w-6 h-6 text-brand-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{clinic.name}</h1>
          </div>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep('schedule')}>
                  <ArrowLeft className="w-4 h-4 mr-1" />Back
                </Button>
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

                <div className="pt-2">
                  <div className="relative mb-3">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">faster with</span>
                    </div>
                  </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const redirect = encodeURIComponent(window.location.pathname)
                        window.location.href = `/api/auth/google-redirect?from=booking&redirect=${redirect}`
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55.9 10.24.9 12s.53 3.45 1.28 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                  </Button>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={() => setStep('confirm')} disabled={!patient.name || !patient.phone}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Powered by ClinicAI · 24/7 AI receptionist for Pakistani clinics
          </p>
        </div>
      </div>
    )
  }

  // ---- CONFIRM SCREEN ----
  if (step === 'confirm') {
    const formattedDate = selectedDate ? formatDate(selectedDate, selectedMonth, selectedYear) : ''

    return (
      <div className="min-h-screen hero-gradient p-4">
        <div className="max-w-xl mx-auto py-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="w-6 h-6 text-brand-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{clinic.name}</h1>
          </div>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Confirm Booking</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep('details')}>
                  <ArrowLeft className="w-4 h-4 mr-1" />Back
                </Button>
              </div>

              <div className="space-y-2 bg-muted/40 rounded-lg p-4 text-sm mb-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span className="font-medium">{selectedDoctor?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{formattedDate}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{selectedTime}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-medium">{patient.name}</span></div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span>Doctor fee</span><span>PKR {doctorFee}</span></div>
                {extraFee > 0 && <div className="flex justify-between"><span>Extra clinic fee</span><span>PKR {extraFee}</span></div>}
                <div className="flex justify-between"><span>Platform fee</span><span>PKR {platformFee}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-chart-2"><span>Discount</span><span>-PKR {discountAmount}</span></div>}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>PKR {totalFee}</span></div>
              </div>

              <div className="space-y-2 mb-4">
                <Label className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />Promo / Referral Code</Label>
                <div className="flex gap-2">
                  <Input placeholder="Enter code" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={handleValidateCode} disabled={validatingCode || !promoCode.trim()}>
                    {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {appliedDiscount && <p className="text-xs text-chart-2">{appliedDiscount.title || 'Discount'} applied: -PKR {appliedDiscount.amount}</p>}
              </div>

              <div className="space-y-2 mb-4">
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

              <Button className="w-full" size="lg" onClick={handleBook} disabled={booking}>
                {booking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Booking
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                By confirming, you agree to the clinic's cancellation policy. Full refund if cancelled 4+ hours before.
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Powered by ClinicAI · 24/7 AI receptionist for Pakistani clinics
          </p>
        </div>
      </div>
    )
  }

  return null
}
