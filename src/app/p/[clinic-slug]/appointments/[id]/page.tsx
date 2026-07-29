'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePatientSession } from '@/lib/use-patient-session'
import { PortalLayout } from '@/components/portal/portal-layout'
import { ChevronLeft, Calendar, Clock, MapPin, Stethoscope, Loader2 } from 'lucide-react'

const API = '/api/patient'

const statusConfig: Record<string, { label: string; color: string }> = {
  booked: { label: 'Booked', color: '#3b82f6' },
  confirmed: { label: 'Confirmed', color: '#22c55e' },
  completed: { label: 'Completed', color: '#10b981' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
  no_show: { label: 'No Show', color: '#f59e0b' },
  held: { label: 'On Hold', color: '#8b5cf6' },
}

function AppointmentDetailContent() {
  const { 'clinic-slug': slug, id: appointmentId } = useParams<{ 'clinic-slug': string; id: string }>()
  const basePath = `/p/${slug}`
  const router = useRouter()
  const { session, loading: authLoading } = usePatientSession()

  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch(`${API}/clinics/${session.clinicId}/history?limit=50`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(body => {
        const appts = body.ok ? body.data : []
        setAppointment(appts.find((a: any) => a.id === appointmentId) || null)
      })
      .finally(() => setLoading(false))
  }, [session])

  if (authLoading || loading) {
    return (
      <PortalLayout basePath={basePath}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} />
        </div>
      </PortalLayout>
    )
  }

  if (!appointment) {
    return (
      <PortalLayout basePath={basePath}>
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">Appointment not found</p>
        </div>
      </PortalLayout>
    )
  }

  const status = statusConfig[appointment.status] || { label: appointment.status, color: '#6b7280' }
  const date = new Date(appointment.start)
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <PortalLayout basePath={basePath}>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div
          className="rounded-2xl overflow-hidden shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--portal-primary), var(--portal-secondary))' }}
        >
          <div className="p-5 text-white">
            <div
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-3"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {status.label}
            </div>
            <h2 className="text-xl font-bold">Dr. {appointment.doctor?.name}</h2>
            <p className="text-white/80 text-sm mt-1">{appointment.doctor?.speciality}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{dateStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm">{time}</span>
            </div>
            {appointment.slot?.tokenNo && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-[var(--portal-primary)]">Token #{appointment.slot.tokenNo}</span>
              </div>
            )}
            {appointment.service?.name && (
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">{appointment.service.name}</span>
              </div>
            )}
          </div>
        </div>

        {appointment.feedback && (
          <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground mb-1">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= (appointment.feedback?.rating || 0) ? 'text-amber-400' : 'text-muted-foreground/30'}>
                  ★
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} /></div>}>
      <AppointmentDetailContent />
    </Suspense>
  )
}
