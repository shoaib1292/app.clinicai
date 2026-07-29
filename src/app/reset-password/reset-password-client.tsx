'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!token) {
      toast.error('Invalid or missing reset token')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const json = await res.json()
      if (json.ok) {
        setDone(true)
      } else {
        toast.error(json.error || 'Failed to reset password')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 hero-gradient p-8 lg:p-12 flex flex-col justify-between">
          <Link href="/" className="flex items-center">
            <img src={logoSrc} alt="ClinicAI" className="h-10 w-auto object-contain" />
          </Link>
          <div className="my-12 lg:my-0">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Invalid <span className="text-gradient-brand">link</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              This password reset link is missing or invalid. Please request a new one.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 ClinicAI. Made in Pakistan.</p>
        </div>
        <div className="lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="py-10 text-center space-y-4">
              <p className="text-muted-foreground">No reset token found in the URL.</p>
              <Button asChild className="gap-2">
                <Link href="/forgot-password">Request a new reset link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <div className="lg:w-1/2 hero-gradient p-8 lg:p-12 flex flex-col justify-between">
          <Link href="/" className="flex items-center">
            <img src={logoSrc} alt="ClinicAI" className="h-10 w-auto object-contain" />
          </Link>
          <div className="my-12 lg:my-0">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Password <span className="text-gradient-brand">updated</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              Your password has been reset successfully. You can now login with your new password.
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
                <h2 className="text-xl font-bold">Password Reset!</h2>
                <p className="text-muted-foreground">You can now sign in with your new password.</p>
              </div>
              <Button asChild className="gap-2">
                <Link href="/login">Go to Login</Link>
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
            Choose a new <span className="text-gradient-brand">password</span>.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md">
            Enter your new password below. Must be at least 8 characters.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 ClinicAI. Made in Pakistan.</p>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-brand" />
              <CardTitle>New Password</CardTitle>
            </div>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="size-4" />}
                Reset Password
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

export function ResetPasswordClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
