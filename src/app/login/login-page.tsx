'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageSlider } from '@/components/ui/image-slider'
import { Loader2, ArrowRight, Shield } from 'lucide-react'
import { toast } from 'sonner'

const images = [
  'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=900&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=900&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&auto=format&fit=crop&q=60',
]

const formVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const itemVariants: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 12 },
  },
}

export function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Login failed')
        setLoading(false)
        return
      }
      toast.success(`Welcome, ${json.data.name}!`)
      router.push(json.data.redirectTo)
      router.refresh()
    } catch {
      toast.error('Network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-5xl h-auto min-h-[640px] md:h-[700px] grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Left: Image slider — clinic atmosphere */}
        <div className="hidden md:block relative">
          <ImageSlider images={images} interval={5000} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <h2 className="text-2xl font-bold tracking-tight">ClinicAI</h2>
            <p className="text-sm text-white/80 mt-1">
              AI-powered receptionist for your clinic. Bookings, reminders, follow-ups — 24/7.
            </p>
          </div>
        </div>

        {/* Right: Login form */}
        <div className="w-full h-full bg-card flex flex-col items-center justify-center p-8 md:p-12">
          <motion.div
            className="w-full max-w-sm"
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Mobile logo */}
            <div className="md:hidden mb-6 flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>

            <motion.h1 variants={itemVariants} className="text-3xl font-bold tracking-tight mb-1.5">
              Staff Login
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground mb-8">
              Sign in to your ClinicAI dashboard
            </motion.p>

            <motion.form variants={itemVariants} onSubmit={onSubmit} className="space-y-5">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>

              {/* Google Sign-In */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = '/api/auth/google-redirect?from=staff'
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55.9 10.24.9 12s.53 3.45 1.28 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </motion.form>

            <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-6">
              No account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create clinic account
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
