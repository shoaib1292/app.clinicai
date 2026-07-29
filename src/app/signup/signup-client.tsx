'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneField } from '@/components/ui/phone-field'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ImageSlider } from '@/components/ui/image-slider'
import { Loader2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const images = [
  'https://images.unsplash.com/photo-1680783954745-3249be59e527?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1742459785723-667110cf8326?q=80&w=793&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&auto=format&fit=crop&q=60',
]

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { y: 14, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 120, damping: 12 },
  },
}

export function SignupClient() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicName, adminName, adminEmail, whatsappNumber, city, password }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Signup failed')
        setLoading(false)
        return
      }
      toast.success('Congratulations! Your clinic is set up.', {
        description: 'We have added 1,000 PKR in free credits to your account.',
      })
      toast.info('Verification email sent!', {
        description: 'Please check your inbox and verify your email address.',
        duration: 8000,
      })
      router.push(json.data.redirectTo)
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-5xl h-auto min-h-[640px] md:h-[760px] grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Left: AI-themed image slider */}
        <div className="hidden md:block relative">
          <ImageSlider images={images} interval={4500} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <Badge variant="secondary" className="mb-3 bg-white/15 text-white border-white/20">
              <Sparkles className="size-3 mr-1" /> AI-Powered
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">
              Your clinic deserves an AI receptionist
            </h2>
            <p className="text-sm text-white/70 mt-2">
              Handle bookings, answer questions, send reminders — 24/7 in Urdu & English over WhatsApp.
            </p>
          </div>
        </div>

        {/* Right: Signup form */}
        <div className="w-full h-full bg-card flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto">
          <motion.div
            className="w-full max-w-sm"
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Mobile header */}
            <div className="md:hidden mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="size-3" /> AI-Powered
              </Badge>
            </div>

            <motion.h1 variants={itemVariants} className="text-2xl md:text-3xl font-bold tracking-tight mb-1.5">
              Clinic Registration
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground mb-6">
              Launch your clinic's AI receptionist today
            </motion.p>

            <motion.form variants={itemVariants} onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic name</Label>
                <Input
                  id="clinicName"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Al-Shifa Family Clinic"
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminName">Your name</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Dr. Ahmed"
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email address</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="dr.ahmed@clinic.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                  <PhoneField
                    id="whatsappNumber"
                    value={whatsappNumber}
                    onChange={setWhatsappNumber}
                    autoComplete="tel-national"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Karachi"
                    required
                    autoComplete="address-level2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

              <ul className="space-y-2 pt-1">
                {[
                  'Free for clinics — always',
                  'Patients pay PKR 50 per appointment',
                  '1,000 PKR free credits on signup',
                  'No credit card required',
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Register clinic <ArrowRight className="size-4" /></>
                )}
              </Button>
            </motion.form>

            <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Login
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
