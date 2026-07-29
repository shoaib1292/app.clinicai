'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePatientSession } from '@/lib/use-patient-session'
import { PortalLayout } from '@/components/portal/portal-layout'
import { DoctorSelector } from '@/components/portal/doctor-selector'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

const API = '/api/patient'

function BookContent() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const basePath = `/p/${slug}`
  const router = useRouter()
  const { session, loading: authLoading } = usePatientSession()

  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch(`${API}/clinics/${session.clinicId}/doctors`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(body => setDoctors(body.ok ? body.data : []))
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

  return (
    <PortalLayout basePath={basePath}>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-lg font-bold">Book Appointment</h2>
          <p className="text-xs text-muted-foreground mt-1">Select a doctor to continue</p>
        </div>
        <DoctorSelector
          doctors={doctors}
          onSelect={(doctorId) => router.push(`${basePath}/book/${doctorId}`)}
        />
      </div>
    </PortalLayout>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} /></div>}>
      <BookContent />
    </Suspense>
  )
}
