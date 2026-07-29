'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

const API = '/api/patient'

export type PatientSession = {
  token: string
  appUserId: string
  clinicId: string
}

/**
 * Reusable hook for patient portal pages.
 * Priority: magic link (?t=) > cookie session > redirect to login.
 * Returns session + loading state. Redirects automatically if no auth.
 */
export function usePatientSession(): { session: PatientSession | null; loading: boolean } {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [session, setSession] = useState<PatientSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const magicToken = searchParams.get('t')

    async function tryCookieLogin(): Promise<PatientSession | null> {
      try {
        const res = await fetch(`${API}/portal/session`)
        if (!res.ok) return null
        const data = await res.json()
        if (!data.ok) return null

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

    async function tryMagicLink(): Promise<PatientSession | null> {
      try {
        const res = await fetch(`${API}/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: magicToken }),
        })
        if (!res.ok) return null
        const data = await res.json()
        if (!data.ok) return null
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
      let sess: PatientSession | null = null

      if (magicToken) sess = await tryMagicLink()
      if (!sess) sess = await tryCookieLogin()

      if (!sess) {
        router.replace(`/p/${slug}/login`)
        return
      }

      setSession(sess)
      setLoading(false)
    }

    init()
  }, [])

  return { session, loading }
}
