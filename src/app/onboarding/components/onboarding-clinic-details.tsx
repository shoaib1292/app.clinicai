'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, MapPin, Upload, Loader2, Image as ImageIcon, Check, Clock } from 'lucide-react'
import { toast } from 'sonner'

// Simple working hours component
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const defaultHours = '09:00'
const defaultEnd = '17:00'

function WorkingHoursEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hours: Record<string, { start: string; end: string }> = (() => {
    try { return JSON.parse(value) } catch { return {} }
  })()

  function toggleDay(day: string) {
    const next = { ...hours }
    if (next[day]) {
      delete next[day]
    } else {
      next[day] = { start: defaultHours, end: defaultEnd }
    }
    onChange(JSON.stringify(next))
  }

  function setTime(day: string, field: 'start' | 'end', time: string) {
    const next = { ...hours }
    next[day] = { ...next[day], [field]: time }
    onChange(JSON.stringify(next))
  }

  return (
    <div className="space-y-1.5">
      {DAYS.map((d) => {
        const enabled = !!hours[d]
        return (
          <div key={d} className="flex items-center gap-2">
            <Button
              variant={enabled ? 'default' : 'outline'}
              size="sm"
              className="w-14 h-7 text-xs"
              onClick={() => toggleDay(d)}
            >
              {d}
            </Button>
            {enabled && (
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="time"
                  value={hours[d].start}
                  onChange={(e) => setTime(d, 'start', e.target.value)}
                  className="h-7 rounded border border-border bg-background px-2 text-xs font-mono w-28"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="time"
                  value={hours[d].end}
                  onChange={(e) => setTime(d, 'end', e.target.value)}
                  className="h-7 rounded border border-border bg-background px-2 text-xs font-mono w-28"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  data: {
    address: string
    latitude: number | null
    longitude: number | null
    logoFile: File | null
    workingHours: string
  }
  onChange: (patch: Partial<Props['data']>) => void
  clinicId: string
}

export function OnboardingClinicDetails({ data, onChange, clinicId }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleLogoUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/clinics/${clinicId}/logo`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Upload failed'); return }
      window.dispatchEvent(new CustomEvent('clinic-logo-updated', { detail: json.data.logoUrl }))
      toast.success('Logo uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    const res = await fetch(`/api/clinics/${clinicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: data.address || undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        workingHours: data.workingHours ? data.workingHours : undefined,
      }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Save failed'); return }

    if (data.logoFile) {
      await handleLogoUpload(data.logoFile)
      onChange({ logoFile: null })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Clinic Details</h2>
        <p className="text-muted-foreground text-sm">Add your clinic's address, logo, and working hours.</p>
      </div>

      <div className="space-y-4">
        {/* Logo */}
        <div>
          <Label>Clinic Logo</Label>
          <div className="mt-1.5 flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {data.logoFile ? data.logoFile.name : 'Upload logo'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onChange({ logoFile: f })
                }}
              />
            </label>
            {data.logoFile && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Check className="size-3" /> Ready to upload
              </span>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="addr">Clinic Address</Label>
          <Textarea
            id="addr"
            rows={3}
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="123 Main Street, Block 5, Gulshan-e-Iqbal..."
          />
        </div>

        {/* Google Maps note */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-start gap-3">
            <MapPin className="size-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                You can set your clinic's exact location later
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Google Maps location helps patients find you on the website. You can add this anytime from Settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="size-4" /> Default Working Hours
          </Label>
          <WorkingHoursEditor value={data.workingHours} onChange={(v) => onChange({ workingHours: v })} />
        </div>
      </div>
    </div>
  )
}
