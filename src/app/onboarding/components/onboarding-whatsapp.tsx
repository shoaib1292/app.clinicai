'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Smartphone, QrCode, Globe, ArrowRight, Loader2, Check, RefreshCw, Copy, Key } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneField } from '@/components/ui/phone-field'

interface ConnectionStatus {
  connected: boolean
  mode: 'meta' | 'evo' | null
  phoneNumber?: string
  qrCode?: string
  pairingCode?: string
}

interface Props {
  data: { whatsappConnected: boolean; whatsappMode: string }
  onChange: (patch: Partial<Props['data']>) => void
  clinicId: string
}

export function OnboardingWhatsApp({ data, onChange, clinicId }: Props) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'code' | 'qr'>('code')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  async function checkStatus() {
    setChecking(true)
    try {
      const res = await fetch(`/api/clinics/${clinicId}/evolution/status`)
      const json = await res.json()
      if (json.ok && json.data) {
        setStatus(json.data)
        if (json.data.connected) {
          onChange({ whatsappConnected: true, whatsappMode: 'evo' })
        }
      }
    } catch { /* */ }
    setChecking(false)
  }

  async function connectEvo() {
    if (mode === 'code' && !phone) { toast.error('Enter your WhatsApp number'); return }
    setLoading(true)
    try {
      const body: Record<string, unknown> = { instanceName: clinicId, mode }
      if (mode === 'code') body.phone = phone

      const res = await fetch(`/api/clinics/${clinicId}/evolution/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed'); setLoading(false); return }

      setStatus({
        connected: false,
        mode: 'evo',
        qrCode: json.data?.qrCode || undefined,
        pairingCode: json.data?.pairingCode || undefined,
        phoneNumber: phone || undefined,
      })
    } catch { toast.error('Connection failed') }
    setLoading(false)
  }

  function copyCode() {
    if (status?.pairingCode) {
      navigator.clipboard.writeText(status.pairingCode)
      setCopied(true)
      toast.success('Code copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (data.whatsappConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">WhatsApp Connection</h2>
          <p className="text-muted-foreground text-sm">WhatsApp AI receptionist for your clinic.</p>
        </div>
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6 flex items-center gap-4">
            <Check className="size-8 text-emerald-600" />
            <div>
              <div className="font-bold text-lg">Connected!</div>
              <div className="text-sm text-muted-foreground">Your AI receptionist is ready to handle patient messages.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Connect WhatsApp</h2>
        <p className="text-muted-foreground text-sm">
          Connect your WhatsApp number so the AI receptionist can reply to patient messages.
        </p>
      </div>

      <Button variant="outline" size="sm" onClick={checkStatus} disabled={checking} className="mb-2">
        <RefreshCw className={`size-3 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
        Check existing connection
      </Button>

      {/* Phone Number Pairing (Recommended) */}
      <Card className="border-primary/30 ring-1 ring-primary/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="size-5 text-primary" />
            <CardTitle className="text-base">Phone Number Pairing</CardTitle>
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Recommended</span>
          </div>
          <CardDescription>
            Enter your WhatsApp number — we'll send a pairing code to your phone. Open WhatsApp, enter the code, done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.pairingCode ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">WhatsApp Number</Label>
                <PhoneField value={phone} onChange={setPhone} />
              </div>
              <Button onClick={connectEvo} disabled={loading || !phone} className="w-full">
                {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Smartphone className="size-4 mr-1.5" />}
                Send Pairing Code
              </Button>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                WhatsApp notification sent to <strong>{phone}</strong>. Open WhatsApp and look for the code, or copy it below:
              </div>
              <div className="bg-muted rounded-lg p-4 flex items-center justify-between">
                <span className="text-2xl font-mono font-bold tracking-widest">{status.pairingCode}</span>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                WhatsApp → Settings → Linked Devices → Link a Device → Enter this code
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code (Alternative) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <QrCode className="size-5" />
            <CardTitle className="text-base">QR Code Pairing</CardTitle>
          </div>
          <CardDescription>Alternative: scan QR code from WhatsApp on your phone. Best if you're on the same device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.qrCode ? (
            <div className="flex justify-center">
              <img src={`data:image/png;base64,${status.qrCode}`} alt="WhatsApp QR" className="w-48 h-48" />
            </div>
          ) : (
            <Button onClick={() => { setMode('qr'); connectEvo() }} disabled={loading} variant="outline" className="w-full">
              {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <QrCode className="size-4 mr-1.5" />}
              Generate QR Code
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Opens WhatsApp → Linked Devices → Scan QR. Only enables basic message replies.
          </p>
        </CardContent>
      </Card>

      {/* Meta Cloud API */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-5" />
            <CardTitle className="text-base">Meta Cloud API</CardTitle>
          </div>
          <CardDescription>
            Official WhatsApp Business API. Supports automation, campaigns, and full features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You'll need a Meta Business account and a WhatsApp Business phone number. We'll guide you through setup.
          </p>
          <Button onClick={() => toast.info('Full Meta setup will be available in Settings after onboarding')}>
            <Globe className="size-4 mr-1.5" /> Connect with Meta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
