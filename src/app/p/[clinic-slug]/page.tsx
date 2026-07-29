'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { PortalLayout } from '@/components/portal/portal-layout'
import { QueueCard } from '@/components/portal/queue-card'
import { AppointmentCard } from '@/components/portal/appointment-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Plus, Loader2 } from 'lucide-react'
import { useBranding } from '@/components/portal/branding-provider'

const API = '/api/patient'

type Session = {
  token: string
  appUserId: string
  clinicId: string
}

function PortalHomeContent() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clinicName } = useBranding()
  const basePath = `/p/${slug}`

  const [session, setSession] = useState<Session | null>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [queue, setQueue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Auto-login via cookie OR magic link ──
  useEffect(() => {
    const magicToken = searchParams.get('t')

    async function tryCookieLogin() {
      try {
        const res = await fetch(`${API}/portal/session`)
        if (!res.ok) return null
        const data = await res.json()
        if (!data.ok) return null

        // Find the matching clinic for this slug
        const clinic = data.data.clinics?.find((c: any) => c.slug === slug)
        if (!clinic) return null

        return {
          token: data.data.token,
          appUserId: data.data.appUserId,
          clinicId: clinic.id,
        }
      } catch {
        return null
      }
    }

    async function tryMagicLink() {
      try {
        const res = await fetch(`${API}/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: magicToken }),
        })
        if (!res.ok) throw new Error('Invalid link')
        const data = await res.json()
        if (!data.ok) throw new Error(data.error || 'Invalid link')
        return {
          token: data.data.token,
          appUserId: data.data.appUserId,
          clinicId: data.data.clinicId,
        }
      } catch {
        return null
      }
    }

    async function init() {
      let sess: Session | null = null

      // Priority: magic link > cookie
      if (magicToken) {
        sess = await tryMagicLink()
      }

      if (!sess) {
        sess = await tryCookieLogin()
      }

      if (!sess) {
        router.replace(`${basePath}/login`)
        return
      }

      setSession(sess)

      try {
        const [appts, q] = await Promise.all([
          fetch(`${API}/clinics/${sess.clinicId}/history?limit=5`, {
            headers: { Authorization: `Bearer ${sess.token}` },
          }).then(r => r.json()).then(d => d.ok ? d.data : []),
          fetch(`${API}/clinics/${sess.clinicId}/token`, {
            headers: { Authorization: `Bearer ${sess.token}` },
          }).then(r => r.json()).then(d => d.ok ? d.data : null),
        ])
        setAppointments(appts)
        setQueue(q)
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleLogout = async () => {
    await fetch(`${API}/portal/logout`, { method: 'POST' })
    router.replace(`${basePath}/login`)
  }

  const upcoming = appointments.filter((a: any) =>
    ['booked', 'confirmed', 'held'].includes(a.status)
  )
  const past = appointments.filter((a: any) =>
    ['completed', 'cancelled', 'no_show'].includes(a.status)
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} />
      </div>
    )
  }

  return (
    <PortalLayout basePath={basePath} onLogout={handleLogout}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center py-2">
          <h2 className="text-lg font-bold">{clinicName}</h2>
          <p className="text-xs text-muted-foreground">Welcome back</p>
        </div>

        {/* Live Queue */}
        <QueueCard
          currentToken={queue?.currentToken ?? null}
          queueLength={queue?.queuePosition ?? 0}
          estimatedWait={queue?.estimatedWait ? `${queue.estimatedWait} min` : 'N/A'}
          recentSlots={[]}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`${basePath}/book`}
            className="flex items-center gap-2 p-3 rounded-xl bg-[var(--portal-primary-light)] border border-[var(--portal-primary)]/20 text-[var(--portal-primary)] hover:bg-[var(--portal-primary-light)]/80 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Book Appointment</span>
          </a>
          <a
            href={`${basePath}/appointments`}
            className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">My Appointments</span>
          </a>
        </div>

        {/* Upcoming */}
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
                  onClick={() => {
                    window.location.href = `${basePath}/appointments/${a.id}`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        {past.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent</h3>
            <div className="space-y-2">
              {past.slice(0, 3).map((a: any) => (
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
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

export default function PortalHomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} />
      </div>
    }>
      <PortalHomeContent />
    </Suspense>
  )
}
