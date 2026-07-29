'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePatientSession } from '@/lib/use-patient-session'
import { PortalLayout } from '@/components/portal/portal-layout'
import { SlotPicker } from '@/components/portal/slot-picker'
import { BookingSummary } from '@/components/portal/booking-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, Loader2 } from 'lucide-react'

const API = '/api/patient'

function generateNext7Days(): string[] {
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function BookDoctorContent() {
  const { 'clinic-slug': slug, doctorId } = useParams<{ 'clinic-slug': string; doctorId: string }>()
  const basePath = `/p/${slug}`
  const router = useRouter()
  const { session, loading: authLoading } = usePatientSession()

  const [step, setStep] = useState<'slots' | 'summary'>('slots')
  const [allSlots, setAllSlots] = useState<{ date: string; slots: any[] }[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [doctor, setDoctor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    const days = generateNext7Days()
    Promise.all([
      ...days.map(date =>
        fetch(`${API}/clinics/${session.clinicId}/slots?doctorId=${doctorId}&date=${date}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }).then(r => r.json()).then(body => ({ date, slots: body.ok ? body.data : [] }))
      ),
      fetch(`${API}/clinics/${session.clinicId}/doctors`, {
        headers: { Authorization: `Bearer ${session.token}` },
      }).then(r => r.json()).then(body => {
        const docs = body.ok ? body.data : []
        setDoctor(docs.find((d: any) => d.id === doctorId) || null)
      }),
    ]).then((results) => {
      const slotResults = results.slice(0, -1) as { date: string; slots: any[] }[]
      setAllSlots(slotResults)
    }).finally(() => setLoading(false))
  }, [session])

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot)
    setStep('summary')
  }

  const handleConfirm = async () => {
    if (!session || !selectedSlot) return
    setBooking(true)
    setError('')
    try {
      const res = await fetch(`${API}/clinics/${session.clinicId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          doctorId,
          slotId: selectedSlot.id,
          paymentMode: 'screenshot',
        }),
      })
      const body = await res.json()
      if (!body.ok) throw new Error(body.error)
      router.push(basePath)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBooking(false)
    }
  }

  if (authLoading || loading) {
    return (
      <PortalLayout basePath={basePath}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} />
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout basePath={basePath}>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2">
          <button onClick={() => step === 'summary' ? setStep('slots') : router.push(`${basePath}/book`)} className="p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Dr. {doctor?.name || '...'}</h2>
            <p className="text-xs text-muted-foreground">{doctor?.speciality}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {step === 'slots' ? (
          <SlotPicker
            slots={allSlots}
            selectedSlotId={selectedSlot?.id}
            onSelect={handleSlotSelect}
          />
        ) : doctor && selectedSlot ? (
          <BookingSummary
            summary={{
              doctorName: doctor.name,
              doctorSpeciality: doctor.speciality || '',
              slotTime: selectedSlot.startTime,
              tokenNo: selectedSlot.tokenNo,
              fees: { doctorFee: 0, platformFee: 0, total: 0 },
              paymentMode: 'Pay at clinic',
            }}
            onConfirm={handleConfirm}
            onBack={() => setStep('slots')}
            loading={booking}
          />
        ) : null}
      </div>
    </PortalLayout>
  )
}

export default function BookDoctorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} /></div>}>
      <BookDoctorContent />
    </Suspense>
  )
}
