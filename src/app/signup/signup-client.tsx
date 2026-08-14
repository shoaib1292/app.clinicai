'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneField } from '@/components/ui/phone-field'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ImageSlider } from '@/components/ui/image-slider'
import { Loader2, ArrowRight, Sparkles, CheckCircle2, User } from 'lucide-react'
import { toast } from 'sonner'

const images = [
  'https://images.unsplash.com/photo-1680783954745-3249be59e527?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1742459785723-667110cf8326?q=80&w=793&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&auto=format&fit=crop&q=60',
]

const formVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}
const itemVariants: Variants = {
  hidden: { y: 14, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 12 } },
}

interface Props {
  provider?: string
  prefilledEmail?: string
  prefilledName?: string
}

export function SignupClient({ provider, prefilledEmail = '', prefilledName = '' }: Props) {
  const router = useRouter()
  const isGoogleSignup = provider === 'google'

  const [clinicName, setClinicName] = useState(prefilledName ? `${prefilledName}'s Clinic` : '')
  const [adminName, setAdminName] = useState(prefilledName)
  const [adminEmail, setAdminEmail] = useState(prefilledEmail)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isGoogleSignup && password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const body: Record<string, string> = { clinicName, adminName, adminEmail, whatsappNumber, city }
      if (!isGoogleSignup) {
        body.password = password
      } else {
        body.provider = 'google'
        body.password = ''
      }
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Signup failed')
        setLoading(false)
        return
      }
      toast.success('Congratulations! Your clinic is set up.')
      toast.info('1,000 PKR free credits added to your account.', { duration: 6000 })
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
        <div className="hidden md:block relative">
          <ImageSlider images={images} interval={4500} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-8 left-8 right-8 text-white">
            <Badge variant="secondary" className="mb-3 bg-white/15 text-white border-white/20">
              <Sparkles className="size-3 mr-1" /> AI-Powered
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight">Your clinic deserves an AI receptionist</h2>
            <p className="text-sm text-white/70 mt-2">
              Handle bookings, answer questions, send reminders — 24/7 in Urdu & English over WhatsApp.
            </p>
          </div>
        </div>

        <div className="w-full h-full bg-card flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto">
          <motion.div className="w-full max-w-sm" variants={formVariants} initial="hidden" animate="visible">
            <div className="md:hidden mb-4 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" /> AI-Powered</Badge>
            </div>

            <motion.h1 variants={itemVariants} className="text-2xl md:text-3xl font-bold tracking-tight mb-1.5">
              Clinic Registration
            </motion.h1>
            <motion.p variants={itemVariants} className="text-muted-foreground mb-6">
              {isGoogleSignup ? 'Just a few more details to complete your setup' : "Launch your clinic's AI receptionist today"}
            </motion.p>

            {isGoogleSignup && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div><p className="text-sm font-medium">Signed in with Google</p><p className="text-xs text-muted-foreground">{prefilledEmail}</p></div>
              </div>
            )}

            <motion.form variants={itemVariants} onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic name</Label>
                <Input id="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Al-Shifa Family Clinic" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminName">Your name</Label>
                <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Dr. Ahmed" required readOnly={isGoogleSignup} className={isGoogleSignup ? 'bg-muted cursor-not-allowed' : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email address</Label>
                <Input id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="dr.ahmed@clinic.com" required readOnly={isGoogleSignup} className={isGoogleSignup ? 'bg-muted cursor-not-allowed' : ''} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                  <PhoneField id="whatsappNumber" value={whatsappNumber} onChange={setWhatsappNumber} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Karachi" required />
                </div>
              </div>
              {!isGoogleSignup && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
                </div>
              )}

              <ul className="space-y-2 pt-1">
                {['Free for clinics — always', 'Patients pay PKR 50 per appointment', '1,000 PKR free credits on signup', 'No credit card required'].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-primary" />{p}
                  </li>
                ))}
              </ul>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Register clinic <ArrowRight className="size-4" /></>}
              </Button>
            </motion.form>

            {!isGoogleSignup && (
              <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground mt-5">
                Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Login</Link>
              </motion.p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
