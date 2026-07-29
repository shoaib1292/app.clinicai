'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, QrCode, MessageCircle, CheckCircle2, XCircle, AlertCircle, Link2, Unlink, Smartphone, RefreshCw, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'

interface WhatsAppConn {
  id: string
  mode: string
  phone: string
  status: string
  evoInstanceName: string | null
  metaPhoneId: string | null
}

interface Clinic {
  id: string
  name: string
  slug: string
  evolutionConnected: boolean
  evolutionInstance: string | null
  metaConnected: boolean
  metaPhoneId: string | null
  metaWabaId: string | null
  phone: string | null
  whatsappConnections: WhatsAppConn[]
}

interface Props {
  clinic: Clinic
}

export function WhatsAppClient({ clinic }: Props) {
  const router = useRouter()
  const [qrLoading, setQrLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrInstanceName, setQrInstanceName] = useState<string | null>(null)
  const [qrStatus, setQrStatus] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(false)

  // Code Pairing state
  const [codePairPhone, setCodePairPhone] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [codePairStatus, setCodePairStatus] = useState<string | null>(null)
  const [codePairError, setCodePairError] = useState<string | null>(null)
  const [codePairLoading, setCodePairLoading] = useState(false)
  const [codePairInstanceName, setCodePairInstanceName] = useState<string | null>(null)
  const [checkingCodePair, setCheckingCodePair] = useState(false)

  // Realtime listener for WhatsApp connection status
  const { lastEvent: whatsappEvent } = useRealtime(`clinic:${clinic.id}:whatsapp`)
  useEffect(() => {
    if (whatsappEvent?.message && typeof whatsappEvent.message === 'object') {
      const msg = whatsappEvent.message as { type: string; status: string }
      if (msg.type === 'whatsapp_connected' && msg.status === 'connected') {
        setCheckingCodePair(false)
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        toast.success('WhatsApp connected successfully!')
        router.refresh()
      }
    }
  }, [whatsappEvent, router])

  // Poll for connection status after QR is generated
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (qrCode && !clinic.evolutionConnected) {
      setCheckingConnection(true)
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/clinics/${clinic.id}/evolution/status`)
          const json = await res.json()
          if (json.ok && (json.data.status === 'connected' || json.data.evolutionConnected)) {
            setCheckingConnection(false)
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            toast.success('WhatsApp connected successfully!')
            router.refresh()
          }
        } catch {
          // silently retry
        }
      }, 5000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [qrCode, clinic.id, clinic.evolutionConnected, router])

  // Poll for connection status after code pairing
  useEffect(() => {
    if (pairingCode && !clinic.evolutionConnected) {
      setCheckingCodePair(true)
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/clinics/${clinic.id}/evolution/status`)
          const json = await res.json()
          if (json.ok && (json.data.status === 'connected' || json.data.evolutionConnected)) {
            setCheckingCodePair(false)
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            toast.success('WhatsApp connected successfully!')
            router.refresh()
          }
        } catch {
          // silently retry
        }
      }, 5000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [pairingCode, clinic.id, clinic.evolutionConnected, router])

  // Meta form
  const [metaPhoneId, setMetaPhoneId] = useState('')
  const [metaToken, setMetaToken] = useState('')
  const [metaWabaId, setMetaWabaId] = useState('')
  const [metaPhone, setMetaPhone] = useState('')
  const [metaLoading, setMetaLoading] = useState(false)

  const evoConn = clinic.whatsappConnections.find((c) => c.mode === 'evo')
  const metaConn = clinic.whatsappConnections.find((c) => c.mode === 'meta')

  async function connectEvolution() {
    setQrLoading(true)
    setQrCode(null)
    setQrError(null)
    try {
      const res = await fetch(`/api/clinics/${clinic.id}/evolution/create`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) {
        const msg = json.error || 'Failed to create WhatsApp connection'
        setQrError(msg)
        toast.error(msg)
        setQrLoading(false)
        return
      }
      setQrCode(json.data.qrCode)
      setQrInstanceName(json.data.instanceName)
      setQrStatus(json.data.status)
      toast.success('QR code generated. WhatsApp scan karein.', { duration: 10000 })
    } catch (e) {
      const msg = 'Network error. Please check your connection and try again.'
      setQrError(msg)
      toast.error(msg)
    }
    setQrLoading(false)
  }

  async function disconnectEvolution() {
    try {
      const res = await fetch(`/api/clinics/${clinic.id}/evolution/disconnect`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Failed to disconnect')
        return
      }
      toast.success('WhatsApp disconnected')
      setQrCode(null)
      setQrInstanceName(null)
      setQrError(null)
      router.refresh()
    } catch {
      toast.error('Network error')
    }
  }

  async function connectCodePair() {
    if (!codePairPhone) {
      toast.error('Phone number required')
      return
    }
    setCodePairLoading(true)
    setPairingCode(null)
    setCodePairError(null)
    try {
      const res = await fetch(`/api/clinics/${clinic.id}/evolution/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'code', phone: codePairPhone }),
      })
      const json = await res.json()
      if (!json.ok) {
        const msg = json.error || 'Failed to generate pairing code'
        setCodePairError(msg)
        toast.error(msg)
        setCodePairLoading(false)
        return
      }
      setPairingCode(json.data.pairingCode)
      setCodePairInstanceName(json.data.instanceName)
      setCodePairStatus(json.data.status)
      toast.success('Pairing code generated! WhatsApp mein enter karein.', { duration: 10000 })
    } catch (e) {
      const msg = 'Network error. Please check your connection and try again.'
      setCodePairError(msg)
      toast.error(msg)
    }
    setCodePairLoading(false)
  }

  async function disconnectCodePair() {
    try {
      const res = await fetch(`/api/clinics/${clinic.id}/evolution/disconnect`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Failed to disconnect')
        return
      }
      toast.success('WhatsApp disconnected')
      setPairingCode(null)
      setCodePairInstanceName(null)
      router.refresh()
    } catch {
      toast.error('Network error')
    }
  }

  async function connectMeta(e: React.FormEvent) {
    e.preventDefault()
    if (!metaPhoneId || !metaToken || !metaWabaId || !metaPhone) {
      toast.error('All fields required')
      return
    }
    setMetaLoading(true)
    try {
      const res = await fetch(`/api/clinics/${clinic.id}/meta/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: metaPhoneId,
          accessToken: metaToken,
          wabaId: metaWabaId,
          phone: metaPhone,
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Failed to connect Meta')
        setMetaLoading(false)
        return
      }
      toast.success('Meta Cloud API connected successfully!')
      setMetaPhoneId('')
      setMetaToken('')
      setMetaWabaId('')
      setMetaPhone('')
      router.refresh()
    } catch {
      toast.error('Network error')
    }
    setMetaLoading(false)
  }

  async function disconnectMeta() {
    try {
      const res = await fetch(`/api/clinics/${clinic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaConnected: false }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Failed to disconnect')
        return
      }
      toast.success('Meta connection removed')
      router.refresh()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp Connection</h1>
        <p className="text-muted-foreground">
          Connect your clinic&apos;s WhatsApp number to enable AI-powered patient messaging.
        </p>
      </div>

      {/* Connection guidance */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Which method should I use?</p>
          <p>
            <strong>Meta Cloud API (recommended):</strong> the official, compliant channel. Best for reliable messaging and higher volume. Free to set up — you only pay Meta per conversation. We can help you get started, just reach out to our team.
          </p>
          <p>
            <strong>QR Code / Phone Pairing (Evolution):</strong> connects your own WhatsApp number in minutes and is great for replying to patients. One thing to keep in mind: because this uses your personal/business number directly, sending a very high volume of messages (e.g. large bulk broadcasts) can risk the number being limited by WhatsApp. For routine appointment reminders and 1:1 replies it works well; if you expect heavy bulk messaging, the Meta Cloud API above is the safer long-term choice.
          </p>
        </div>
      </div>

      {/* Current connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Smartphone className="size-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">WhatsApp Link</div>
                <div className="text-xs text-muted-foreground">QR / phone number pairing</div>
              </div>
            </div>
            <Badge variant={clinic.evolutionConnected ? 'default' : 'secondary'} className={clinic.evolutionConnected ? '' : 'text-muted-foreground'}>
              {clinic.evolutionConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <MessageCircle className="size-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Meta Cloud API {clinic.metaPhoneId && `(${clinic.metaPhoneId})`}</div>
                <div className="text-xs text-muted-foreground">Official WhatsApp Business API</div>
              </div>
            </div>
            <Badge variant={clinic.metaConnected ? 'default' : 'secondary'} className={clinic.metaConnected ? '' : 'text-muted-foreground'}>
              {clinic.metaConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="meta" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meta" className="gap-2">
            <MessageCircle className="size-4" />
            Meta Cloud API
            <Badge variant="secondary" className="ml-1 text-[10px]">Recommended</Badge>
          </TabsTrigger>
          <TabsTrigger value="evolution" className="gap-2">
            <QrCode className="size-4" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="code-pair" className="gap-2">
            <KeyRound className="size-4" />
            Phone Number Pairing
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Evolution QR */}
        <TabsContent value="evolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connect via QR Code</CardTitle>
              <CardDescription>
                Apna existing WhatsApp number connect karein. QR scan karein aur 2 minute me live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!clinic.evolutionConnected ? (
                <>
                  {qrCode ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          className="size-64 rounded-xl border bg-white p-2"
                          width={256}
                          height={256}
                        />
                      </div>
                      {checkingConnection && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Checking connection after QR scan...
                        </div>
                      )}
                      <div className="rounded-lg border border-brand/20 bg-brand/5 p-4 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-brand">
                          <AlertCircle className="size-4" />
                          Scan this QR with WhatsApp
                        </div>
                        <ol className="text-sm text-muted-foreground text-left space-y-1 max-w-sm mx-auto">
                          <li>1. Open WhatsApp on your phone</li>
                          <li>2. Tap menu (⋮) → Linked Devices → Link a Device</li>
                          <li>3. Scan the QR code above</li>
                          <li>4. Wait for connection confirmation</li>
                        </ol>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setQrCode(null); setQrInstanceName(null) }}>
                          Cancel
                        </Button>
                        <Button onClick={disconnectEvolution} variant="destructive">
                          <XCircle className="size-4 mr-1" /> Cancel & close
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-4">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand/10">
                        <QrCode className="size-8 text-brand" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Connect your WhatsApp number</p>
                        <p className="text-sm text-muted-foreground">
                          A QR code generate hoga jo aap WhatsApp mein scan karein ge. Ek baar scan, hamesha connected.
                        </p>
                      </div>
                      {qrError && (
                        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                          <XCircle className="size-4 shrink-0 mt-0.5" />
                          {qrError}
                        </div>
                      )}
                      <Button size="lg" onClick={connectEvolution} disabled={qrLoading}>
                        {qrLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <QrCode className="size-4 mr-1" />}
                        Generate QR Code
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">WhatsApp connected</p>
                    <p className="text-sm text-muted-foreground">
                      Your number is now linked.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={disconnectEvolution}>
                    <Unlink className="size-4 mr-1" /> Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Code Pairing */}
        <TabsContent value="code-pair" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connect via Code Pairing</CardTitle>
              <CardDescription>
                Apna number connect karein bina QR scan kiye. Phone number enter karein aur pairing code WhatsApp mein enter karein.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!clinic.evolutionConnected ? (
                <>
                  {pairingCode ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-8 shadow-sm">
                          <KeyRound className="size-8 text-brand" />
                          <span className="text-4xl font-bold tracking-[0.25em] text-brand font-mono">
                            {pairingCode}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Enter this code in WhatsApp
                          </span>
                        </div>
                      </div>
                      {checkingCodePair && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Waiting for connection after code entry...
                        </div>
                      )}
                      <div className="rounded-lg border border-brand/20 bg-brand/5 p-4 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-brand">
                          <AlertCircle className="size-4" />
                          Steps to connect
                        </div>
                        <ol className="text-sm text-muted-foreground text-left space-y-1 max-w-sm mx-auto">
                          <li>1. Open WhatsApp on your phone</li>
                          <li>2. Tap menu (⋮) → Linked Devices</li>
                          <li>3. Tap &ldquo;Link with Phone Number&rdquo;</li>
                          <li>4. Enter the pairing code above</li>
                          <li>5. Wait for connection confirmation</li>
                        </ol>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setPairingCode(null); setCodePairInstanceName(null) }}>
                          Cancel
                        </Button>
                        <Button onClick={disconnectCodePair} variant="destructive">
                          <XCircle className="size-4 mr-1" /> Cancel & close
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-4">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand/10">
                        <KeyRound className="size-8 text-brand" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Connect without QR scan</p>
                        <p className="text-sm text-muted-foreground">
                          Apna phone number enter karein aur ek pairing code generate hoga. Phir usay WhatsApp mein enter karein.
                        </p>
                      </div>
                      <div className="max-w-xs mx-auto space-y-3">
                        <div className="space-y-2 text-left">
                          <Label htmlFor="codePairPhone">Phone Number (with country code)</Label>
                          <Input
                            id="codePairPhone"
                            value={codePairPhone}
                            onChange={(e) => setCodePairPhone(e.target.value)}
                            placeholder="923001234567"
                          />
                        </div>
                        <Button size="lg" onClick={connectCodePair} disabled={codePairLoading || !codePairPhone}>
                          {codePairLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <KeyRound className="size-4 mr-1" />}
                          Generate Code
                        </Button>
                        {codePairError && (
                          <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2 text-left">
                            <XCircle className="size-4 shrink-0 mt-0.5" />
                            {codePairError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">WhatsApp connected</p>
                    <p className="text-sm text-muted-foreground">
                      Your number is now linked.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={disconnectCodePair}>
                    <Unlink className="size-4 mr-1" /> Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Meta Cloud API */}
        <TabsContent value="meta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connect via Meta Cloud API</CardTitle>
              <CardDescription>
                Meta Business account se official WhatsApp API connect karein. Templates, bulk reminders, aur broadcasts ke liye.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!clinic.metaConnected ? (
                <form onSubmit={connectMeta} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="metaPhone">WhatsApp Business Number (with country code)</Label>
                    <Input
                      id="metaPhone"
                      value={metaPhone}
                      onChange={(e) => setMetaPhone(e.target.value)}
                      placeholder="+923001234567"
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="metaPhoneId">Phone Number ID</Label>
                      <Input
                        id="metaPhoneId"
                        value={metaPhoneId}
                        onChange={(e) => setMetaPhoneId(e.target.value)}
                        placeholder="From Meta Business Manager"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="metaWabaId">WABA ID</Label>
                      <Input
                        id="metaWabaId"
                        value={metaWabaId}
                        onChange={(e) => setMetaWabaId(e.target.value)}
                        placeholder="WhatsApp Business Account ID"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaToken">Access Token</Label>
                    <Input
                      id="metaToken"
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="Permanent access token from Meta"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Token encrypted stored hota hai — platform staff bhi nahi dekh sakta.
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <strong>Webhook URL configure karein:</strong>{' '}
                    <code className="font-mono">https://app.clinicai.pk/api/webhooks/meta</code>
                    <br />
                    Verify token: <code className="font-mono">clinicsai_verify</code>
                  </div>
                  <Button type="submit" disabled={metaLoading}>
                    {metaLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Link2 className="size-4 mr-1" />}
                    Connect Meta API
                  </Button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Meta Cloud API connected</p>
                    <p className="text-sm text-muted-foreground">
                      Phone: {clinic.metaPhoneId || metaConn?.metaPhoneId} · WABA: {clinic.metaWabaId}
                    </p>
                  </div>
                  <Button variant="destructive" onClick={disconnectMeta}>
                    <Unlink className="size-4 mr-1" /> Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
