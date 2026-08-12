'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [sending, setSending] = useState(false)

  async function resend() {
    setSending(true)
    try {
      // Resend uses the same signup endpoint with an existing-email flag → simplest path:
      // instead, hit a dedicated resend API if available; otherwise guide user to login.
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('Verification email sent! Check your inbox.')
      } else {
        toast.error(json.error || 'Failed to resend')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardContent className="py-10 px-8 text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a verification link to <strong>{email || 'your inbox'}</strong>. Click it to activate
              your clinic account, then you can log in and start onboarding.
            </p>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={resend} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Resend email
          </Button>
          <Button asChild className="w-full gap-2">
            <Link href="/login">
              Go to login <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function VerifyEmailClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
