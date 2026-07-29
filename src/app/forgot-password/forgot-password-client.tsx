'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ForgotPasswordClient() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (json.ok) {
        setSent(true)
      } else {
        toast.error(json.error || 'Failed to send reset email')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 hero-gradient p-8 lg:p-12 flex flex-col justify-between">
          <Link href="/" className="flex items-center">
            <img src={logoSrc} alt="ClinicAI" className="h-10 w-auto object-contain" />
          </Link>
          <div className="my-12 lg:my-0">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Check your <span className="text-gradient-brand">email</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              We&apos;ve sent a password reset link to your inbox.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 ClinicAI. Made in Pakistan.</p>
        </div>

        <div className="lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="py-10 px-8 text-center space-y-6">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Email Sent</h2>
                <p className="text-muted-foreground">
                  If an account with <span className="font-medium text-foreground">{email}</span> exists, you&apos;ll receive a password reset link shortly. Check your spam folder if you don&apos;t see it.
                </p>
              </div>
              <Button variant="outline" asChild className="gap-2">
                <Link href="/login">
                  <ArrowLeft className="size-4" /> Back to Login
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 hero-gradient p-8 lg:p-12 flex flex-col justify-between">
        <Link href="/" className="flex items-center">
          <img src={logoSrc} alt="ClinicAI" className="h-10 w-auto object-contain" />
        </Link>
        <div className="my-12 lg:my-0">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Forgot your <span className="text-gradient-brand">password</span>?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md">
            No worries. Enter your email and we&apos;ll send you a link to reset it.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 ClinicAI. Made in Pakistan.</p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your registered email address</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.pk"
                  required
                  autoComplete="email"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="size-4" />}
                Send Reset Link
              </Button>
              <Button variant="outline" asChild className="w-full gap-2">
                <Link href="/login">
                  <ArrowLeft className="size-4" /> Back to Login
                </Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
