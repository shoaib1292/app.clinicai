'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, RefreshCw, Unplug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface GoogleStatus {
  connected: boolean
  email?: string
  status?: string
  features?: Record<string, boolean>
  scopes?: string
  health?: {
    tokenValid: boolean
    tokenExpiringSoon: boolean
    tokenExpiresAt?: string
  }
  lastSync?: string
  lastError?: string
  lastErrorAt?: string
  daysSinceConnected?: number
  featuresAvailable?: boolean
}

const FEATURE_LABELS: Record<string, string> = {
  calendar: 'Calendar Sync',
  meet: 'Video Call Links',
  gmail: 'Email Sending',
  drive: 'Document Storage',
  contacts: 'Contacts Sync',
  business: 'Business Profile',
}

const FEATURE_DESCS: Record<string, string> = {
  calendar: 'Sync appointments automatically with Google Calendar',
  meet: 'Auto-generate Google Meet links for video consultations',
  gmail: 'Send appointment emails from your Gmail address',
  drive: 'Auto-organize patient documents in Google Drive',
  contacts: 'Sync patients and staff to Google Contacts',
  business: 'Read clinic info, reviews, and hours',
}

export function GoogleIntegrationTab({ clinicId }: { clinicId: string }) {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [clinicId])

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clinics/${clinicId}/google/status`)
      const json = await res.json()
      if (json.ok) setStatus(json.data)
    } catch { toast.error('Failed to load Google status') }
    finally { setLoading(false) }
  }

  async function handleToggle(feature: string, enabled: boolean) {
    setToggling(feature)
    try {
      const res = await fetch(`/api/clinics/${clinicId}/google/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, enabled }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error); return }

      if (json.data.needsConsent && json.data.consentUrl) {
        toast.info(`Opening Google to grant ${FEATURE_LABELS[feature]} access...`)
        window.location.href = json.data.consentUrl
        return
      }

      toast.success(`${FEATURE_LABELS[feature]} ${enabled ? 'enabled' : 'disabled'}`)
      await fetchStatus()
    } catch { toast.error('Failed to toggle feature') }
    finally { setToggling(null) }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google? Appointments and features will fall back to default systems.')) return
    try {
      const res = await fetch(`/api/clinics/${clinicId}/google/disconnect`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error); return }
      toast.success('Google disconnected')
      await fetchStatus()
    } catch { toast.error('Failed to disconnect') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Integration</CardTitle>
          <CardDescription>
            Connect Google to enable calendar sync, video calls, email, and document storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <ExternalLink className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Not connected</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Connect your Google account to unlock Calendar, Meet, Gmail, Drive, and Contacts.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                window.location.href = `/api/auth/google-redirect?from=connect&clinicId=${clinicId}`
              }}
            >
              Connect Google
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Google Integration</CardTitle>
              <CardDescription>Connected as {status.email}</CardDescription>
            </div>
            <Badge variant={status.status === 'active' ? 'default' : status.status === 'expired' ? 'destructive' : 'secondary'}>
              {status.status === 'active' ? <CheckCircle className="h-3 w-3 mr-1 inline" /> :
               status.status === 'expired' ? <XCircle className="h-3 w-3 mr-1 inline" /> :
               <AlertTriangle className="h-3 w-3 mr-1 inline" />}
              {status.status || 'active'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Token status: </span>
              {status.health?.tokenValid
                ? <span className="text-green-600 font-medium">Valid</span>
                : <span className="text-red-600 font-medium">Expired</span>}
              {status.health?.tokenExpiringSoon && (
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">Expiring soon</Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Connected: </span>
              <span>{status.daysSinceConnected} days ago</span>
            </div>
            {status.lastSync && (
              <div>
                <span className="text-muted-foreground">Last sync: </span>
                <span>{new Date(status.lastSync).toLocaleString()}</span>
              </div>
            )}
          </div>
          {status.lastError && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                <span className="font-medium">Last error: </span>
                {status.lastError}
                {status.lastErrorAt && <span className="text-xs ml-1">({new Date(status.lastErrorAt).toLocaleString()})</span>}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={fetchStatus} className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDisconnect} className="gap-1 text-red-600 hover:text-red-700">
              <Unplug className="h-3.5 w-3.5" /> Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Features</CardTitle>
          <CardDescription>Enable Google services for your clinic. Each feature requires its own permission.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const enabled = status.features?.[key] ?? false
            return (
              <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{FEATURE_DESCS[key]}</p>
                  {key === 'meet' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Requires Calendar Sync to be enabled first.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {toggling === key && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => handleToggle(key, v)}
                    disabled={toggling === key || (key === 'meet' && !status.features?.calendar) || status.status !== 'active'}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Granted Scopes */}
      <Card>
        <CardHeader>
          <CardTitle>Granted Permissions</CardTitle>
          <CardDescription>These are the permissions you've granted to ClinicAI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {status.scopes?.split(' ').filter(Boolean).map(scope => (
              <div key={scope} className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                <span className="text-muted-foreground">{scope.replace('https://www.googleapis.com/auth/', '')}</span>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground">No scopes granted yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
