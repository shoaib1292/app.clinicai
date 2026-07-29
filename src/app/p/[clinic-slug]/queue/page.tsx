'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { usePatientSession } from '@/lib/use-patient-session'
import { PortalLayout } from '@/components/portal/portal-layout'
import { QueueCard } from '@/components/portal/queue-card'
import { Clock, Loader2 } from 'lucide-react'

const API = '/api/patient'

function QueueContent() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const basePath = `/p/${slug}`
  const { session, loading: authLoading } = usePatientSession()

  const [queue, setQueue] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch(`${API}/clinics/${session.clinicId}/token`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(body => setQueue(body.ok ? body.data : null))
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

  if (queue && queue.status !== 'no_appointment') {
    return (
      <PortalLayout basePath={basePath}>
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <QueueCard
            currentToken={queue.currentToken}
            queueLength={queue.queuePosition ?? 0}
            estimatedWait={queue.estimatedWait ? `${queue.estimatedWait} min` : 'N/A'}
            recentSlots={[]}
          />

          <div className="rounded-2xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold mb-3">Your Appointment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doctor</span>
                <span className="font-medium">Dr. {queue.doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Token</span>
                <span className="font-semibold text-[var(--portal-primary)]">#{queue.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">People Ahead</span>
                <span className="font-medium">{queue.queuePosition ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{queue.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout basePath={basePath}>
      <div className="text-center py-16 animate-in fade-in duration-500">
        <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No active appointment today</p>
        <a
          href={`${basePath}/book`}
          className="inline-block mt-4 text-sm font-medium"
          style={{ color: 'var(--portal-primary)' }}
        >
          Book an appointment →
        </a>
      </div>
    </PortalLayout>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><PortalLayout basePath=""><div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} /></div></PortalLayout></div>}>
      <QueueContent />
    </Suspense>
  )
}
