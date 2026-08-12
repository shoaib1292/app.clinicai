'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Globe, Palette, Link2, Eye } from 'lucide-react'

interface ClinicData {
  id: string
  name: string
  slug: string
  brandingPrimaryColor: string | null
  brandingSecondaryColor: string | null
  patientPortalEnabled: boolean
  logoUrl: string | null
}

export function PatientPortalClient({ clinic }: { clinic: ClinicData }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(clinic.patientPortalEnabled)
  const [primaryColor, setPrimaryColor] = useState(clinic.brandingPrimaryColor || '#111111')
  const [secondaryColor, setSecondaryColor] = useState(clinic.brandingSecondaryColor || '#333333')
  const [saving, setSaving] = useState(false)

  const domain = typeof window !== 'undefined' ? window.location.origin : ''
  const portalUrl = `${domain}/p/${clinic.slug}`

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clinics/${clinic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientPortalEnabled: enabled,
          brandingPrimaryColor: primaryColor,
          brandingSecondaryColor: secondaryColor,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Patient portal settings saved')
        router.refresh()
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patient Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Give your patients a mobile-app-like experience to book appointments, check queue, and manage their visits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Enable Patient Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Portal Status</Label>
              <p className="text-xs text-muted-foreground">When enabled, patients can access your branded portal.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Your Portal URL</p>
                <p className="text-sm font-mono truncate">{portalUrl}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl)
                  toast.success('URL copied!')
                }}
              >
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Portal Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#111111"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  placeholder="#333333"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 border bg-card" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
            <p className="text-white/90 text-xs">Preview</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                {clinic.name.charAt(0)}
              </div>
              <span className="text-white text-sm font-semibold">{clinic.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {enabled && (
          <Button variant="outline" onClick={() => window.open(portalUrl, '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Preview Portal
          </Button>
        )}
      </div>
    </div>
  )
}
