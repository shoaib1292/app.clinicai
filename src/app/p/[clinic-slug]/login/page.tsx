'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBranding } from '@/components/portal/branding-provider'
import { PhoneInput } from '@/components/ui/phone-input'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react'

const API = '/api/patient'

export default function PatientLoginPage() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const router = useRouter()
  const { clinicName, logoUrl } = useBranding()

  const [step, setStep] = useState<'phone' | 'link'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLoginWithWhatsApp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/portal/whatsapp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, clinicSlug: slug }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Could not send login link')
      setStep('link')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="safe-area-top px-4 py-3 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => router.push(`/p/${slug}`)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={clinicName} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--portal-primary)' }}
            >
              {clinicName.charAt(0)}
            </div>
          )}
          <span className="text-sm font-semibold truncate">{clinicName}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mb-4 mx-auto flex items-center justify-center"
            style={{ background: 'var(--portal-primary-light)' }}>
            <MessageCircle className="w-8 h-8" style={{ color: 'var(--portal-primary)' }} />
          </div>
          <h1 className="text-xl font-bold mb-1">
            {step === 'phone' ? 'Welcome Back' : 'Check your WhatsApp'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 'phone'
              ? `Sign in to ${clinicName} patient portal`
              : 'Hum ne aap ke WhatsApp par ek login link bhej diya hai. Us par tap karein aur portal khul jayega.'}
          </p>
        </div>

        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {step === 'phone' && (
          <div className="w-full space-y-4">
            <label className="block text-sm font-medium text-muted-foreground">Phone Number</label>
            <PhoneInput
              value={phone}
              onChange={(val) => setPhone(val || '')}
              placeholder="3123456789"
              defaultCountry="PK"
              disabled={loading}
            />
            <Button
              className="w-full h-12 text-sm font-semibold rounded-xl"
              style={{ background: 'var(--portal-primary)' }}
              onClick={handleLoginWithWhatsApp}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><MessageCircle className="w-5 h-5 mr-2" />Login with WhatsApp</>)}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Free login link aap ke WhatsApp par aayega — koi OTP cost nahi.
            </p>
          </div>
        )}

        {step === 'link' && (
          <div className="w-full space-y-4 text-center">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-green-500/10">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Link open karne ke baad aap automatically login ho jayenge. Link 15 minute valid hai.
            </p>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl"
              onClick={() => { setStep('phone'); setPhone('') }}
            >
              Use a different number
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
