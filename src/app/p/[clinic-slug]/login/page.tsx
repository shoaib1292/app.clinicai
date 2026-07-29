'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBranding } from '@/components/portal/branding-provider'
import { PhoneInput } from '@/components/ui/phone-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, MessageCircle, Loader2 } from 'lucide-react'

const API = '/api/patient'

export default function PatientLoginPage() {
  const { 'clinic-slug': slug } = useParams<{ 'clinic-slug': string }>()
  const router = useRouter()
  const { clinicName, logoUrl } = useBranding()

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const phoneNormalizedRef = useRef('')

  // Auto-focus first OTP input
  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus()
  }, [step])

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to send OTP')
      phoneNormalizedRef.current = digits
      setStep('otp')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)

    // Move to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit on last digit
    if (value && index === 5) {
      const fullOtp = next.join('')
      if (fullOtp.length === 6) {
        setTimeout(() => handleVerifyOtp(fullOtp), 100)
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!paste) return
    const filled = [...otp]
    for (let i = 0; i < paste.length; i++) filled[i] = paste[i]
    setOtp(filled)
    otpRefs.current[Math.min(paste.length, 5)]?.focus()
    if (paste.length === 6) {
      setTimeout(() => handleVerifyOtp(paste), 100)
    }
  }

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNormalizedRef.current,
          otp: code,
          clinicSlug: slug,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        throw new Error(data.error || 'Invalid OTP')
      }
      // Cookie is set by the API — redirect to home
      router.push(`/p/${slug}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = () => {
    setOtp(['', '', '', '', '', ''])
    setStep('phone')
    setResent(true)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with clinic branding */}
      <div className="safe-area-top px-4 py-3 flex items-center gap-3 border-b border-border">
        <button
          onClick={() => step === 'otp' ? setStep('phone') : router.push(`/p/${slug}`)}
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
        {/* Welcome */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mb-4 mx-auto flex items-center justify-center"
            style={{ background: 'var(--portal-primary-light)' }}>
            <MessageCircle className="w-8 h-8" style={{ color: 'var(--portal-primary)' }} />
          </div>
          <h1 className="text-xl font-bold mb-1">
            {step === 'phone' ? 'Welcome Back' : 'Enter OTP'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 'phone'
              ? `Sign in to ${clinicName} patient portal`
              : `We sent a 6-digit code to +${phoneNormalizedRef.current ? '••••' + phoneNormalizedRef.current.slice(-4) : ''}`
            }
          </p>
        </div>

        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Phone Step */}
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
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP via WhatsApp'}
            </Button>
            {resent && (
              <p className="text-xs text-muted-foreground text-center">OTP not received? Make sure your WhatsApp number is correct and try again.</p>
            )}
          </div>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <div className="w-full space-y-4">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-lg font-bold rounded-xl"
                />
              ))}
            </div>
            {loading && (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="text-center">
              <button
                onClick={handleResend}
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--portal-primary)' }}
              >
                Didn't get the code? Try a different number
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
