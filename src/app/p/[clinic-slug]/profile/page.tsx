'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePatientSession } from '@/lib/use-patient-session'
import { PortalLayout } from '@/components/portal/portal-layout'
import { Phone, Globe, Loader2 } from 'lucide-react'

const API = '/api/patient'

function ProfileContent() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const basePath = `/p/${slug}`
  const router = useRouter()
  const { session, loading: authLoading } = usePatientSession()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(body => setProfile(body.ok ? body.data : null))
      .finally(() => setLoading(false))
  }, [session])

  const handleLogout = async () => {
    await fetch(`${API}/portal/logout`, { method: 'POST' })
    router.replace(`${basePath}/login`)
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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3"
            style={{ background: 'var(--portal-primary)' }}
          >
            {profile?.phone?.slice(-2) || '?'}
          </div>
          <h2 className="text-lg font-bold">Patient</h2>
          <p className="text-sm text-muted-foreground">{profile?.phone}</p>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{profile?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Clinics</p>
                <p className="text-sm font-medium">{profile?.clinics?.length || 0} clinic(s) linked</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3">Settings</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm">Change Language</span>
                <span className="text-xs text-muted-foreground">English / اردو</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm">Notification Preferences</span>
                <span className="text-xs text-muted-foreground">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="w-full p-3 rounded-lg text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><PortalLayout basePath=""><div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--portal-primary)' }} /></div></PortalLayout></div>}>
      <ProfileContent />
    </Suspense>
  )
}
