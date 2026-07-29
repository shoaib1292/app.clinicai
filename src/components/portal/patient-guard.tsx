'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function PatientGuard({
  children,
  verifyToken,
  onSessionReady,
}: {
  children: React.ReactNode
  verifyToken: (t: string) => Promise<{ token: string; appUserId: string; clinicId: string }>
  onSessionReady: (data: { appUserId: string; clinicId: string; token: string }) => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const magicToken = searchParams.get('t')
    if (!magicToken) {
      setError('No access link provided')
      setLoading(false)
      return
    }

    verifyToken(magicToken)
      .then((data) => {
        onSessionReady(data)
        const cleanPath = window.location.pathname
        router.replace(cleanPath)
      })
      .catch(() => {
        setError('Link expired or invalid. Please request a new link from the clinic.')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--portal-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verifying link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4 text-2xl">!</div>
          <h1 className="text-lg font-bold mb-2">Link Expired</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
