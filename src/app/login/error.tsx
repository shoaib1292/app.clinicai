'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-red-500" />
      <h2 className="text-lg font-semibold">Login Error</h2>
      <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
      <Button onClick={reset} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  )
}
