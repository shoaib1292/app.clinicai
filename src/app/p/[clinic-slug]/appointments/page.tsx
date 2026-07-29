'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePatientSession } from '@/lib/use-patient-session'
import { PortalLayout } from '@/components/portal/portal-layout'
import { AppointmentCard } from '@/components/portal/appointment-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Loader2 } from 'lucide-react'

const API = '/api/patient'

function AppointmentsContent() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const basePath = `/p/${slug}`
  const router = useRouter()
  const { session, loading: authLoading } = usePatientSession()

  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch(`${API}/clinics/${session.clinicId}/history?limit=50`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(body => setAppointments(body.ok ? body.data : []))
      .finally(() => setLoading(false))
  }, [session])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} />
      </div>
    )
  }

  const upcoming = appointments.filter((a: any) =>
    ['booked', 'confirmed', 'held'].includes(a.status)
  )
  const past = appointments.filter((a: any) =>
    ['completed', 'cancelled', 'no_show'].includes(a.status)
  )

  return (
    <PortalLayout basePath={basePath}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {upcoming.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Upcoming</h3>
            <div className="space-y-2">
              {upcoming.map((a: any) => (
                <AppointmentCard
                  key={a.id}
                  appointment={{
                    id: a.id,
                    start: a.start,
                    status: a.status,
                    doctorName: a.doctor?.name || 'Unknown',
                    doctorSpeciality: a.doctor?.speciality || '',
                    tokenNo: a.slot?.tokenNo || null,
                  }}
                  onClick={() => router.push(`${basePath}/appointments/${a.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">History</h3>
            <div className="space-y-2">
              {past.map((a: any) => (
                <AppointmentCard
                  key={a.id}
                  appointment={{
                    id: a.id,
                    start: a.start,
                    status: a.status,
                    doctorName: a.doctor?.name || 'Unknown',
                    doctorSpeciality: a.doctor?.speciality || '',
                    tokenNo: a.slot?.tokenNo || null,
                  }}
                  onClick={() => router.push(`${basePath}/appointments/${a.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {appointments.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No appointments yet</p>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} /></div>}>
      <AppointmentsContent />
    </Suspense>
  )
}
