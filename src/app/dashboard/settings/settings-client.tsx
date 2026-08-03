'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Building2, ToggleLeft, Keyboard, CalendarClock, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { ClinicProfileTab, type SettingsForm } from './components/clinic-profile-tab'
import { FeaturesToggleTab } from './components/features-toggle-tab'
import { KeyboardShortcutsTab } from './components/keyboard-shortcuts-tab'
import { WorkingHoursTab } from './components/schedule-editor'
import { ClinicBrandingTab } from './components/clinic-branding-tab'

interface Clinic {
  id: string
  name: string
  city: string | null
  phone: string | null
  whatsappNumber: string | null
  address: string | null
  timezone: string
  currency: string
  onlinePaymentsEnabled: boolean
  agentEnabled: boolean
  logoUrl: string | null
  workingHours: string | null
}

const SETTINGS_TABS = [
  { value: 'clinic-profile', label: 'Clinic Profile', icon: Building2, description: 'Logo, basic info, and regional settings.' },
  { value: 'branding', label: 'Branding & Info', icon: Palette, description: 'Colors, fonts, doctor branding, agent persona, and stats.' },
  { value: 'features-toggle', label: 'Features Toggle', icon: ToggleLeft, description: 'Turn agent and payments features on or off.' },
  { value: 'working-hours', label: 'Working Hours', icon: CalendarClock, description: 'Clinic-wide default availability and breaks.' },
  { value: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard, description: 'Speed up your workflow with hotkeys.' },
] as const

export function SettingsClient({ clinic, userType, subFeatures, brandingData }: {
  clinic: Clinic | null
  userType: string
  subFeatures?: Record<string, boolean>
  brandingData?: any
}) {
  const [form, setForm] = useState<SettingsForm>({
    name: clinic?.name || '',
    city: clinic?.city || '',
    phone: clinic?.phone || '',
    whatsappNumber: clinic?.whatsappNumber || '',
    address: clinic?.address || '',
    timezone: clinic?.timezone || 'Asia/Karachi',
    currency: clinic?.currency || 'PKR',
    onlinePaymentsEnabled: clinic?.onlinePaymentsEnabled ?? false,
    agentEnabled: clinic?.agentEnabled ?? false,
    pharmacyEnabled: clinic?.pharmacyEnabled ?? false,
    inventoryEnabled: clinic?.inventoryEnabled ?? false,
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(clinic?.logoUrl || null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)

  async function uploadLogo() {
    if (!clinic || !logoFile) return
    setSavingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', logoFile)
      const res = await fetch(`/api/clinics/${clinic.id}/logo`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Upload failed'); return }
      setLogoUrl(json.data.logoUrl)
      setLogoFile(null)
      toast.success('Logo updated')
      window.dispatchEvent(new CustomEvent('clinic-logo-updated', { detail: json.data.logoUrl }))
    } catch {
      toast.error('Network error')
    } finally {
      setSavingLogo(false)
    }
  }

  async function save() {
    if (!clinic) return
    if (!form.name) { toast.error('Clinic name required'); return }
    setSaving(true)
    const res = await fetch(`/api/clinics/${clinic.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        city: form.city,
        phone: form.phone,
        whatsappNumber: form.whatsappNumber || null,
        address: form.address,
        timezone: form.timezone,
        currency: form.currency,
        onlinePaymentsEnabled: form.onlinePaymentsEnabled,
        agentEnabled: form.agentEnabled,
        pharmacyEnabled: form.pharmacyEnabled,
        inventoryEnabled: form.inventoryEnabled,
        combineFees: form.combineFees,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!json.ok) { toast.error(json.error || 'Save failed'); return }
    toast.success('Settings saved')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">{clinic ? 'Manage your clinic profile, features, and preferences.' : 'Keyboard shortcuts reference.'}</p>
      </div>

      <Tabs defaultValue="clinic-profile" className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <TabsList className="h-fit flex-col items-stretch gap-1 bg-transparent p-0 md:sticky md:top-6 self-start">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="justify-start gap-2 px-3 py-2 h-auto data-[state=active]:bg-muted data-[state=active]:shadow-none"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="min-w-0 max-w-4xl">
          <TabsContent value="clinic-profile">
            {clinic ? (
              <ClinicProfileTab
                clinicId={clinic.id}
                form={form}
                setForm={setForm}
                logoUrl={logoUrl}
                setLogoFile={setLogoFile}
                logoFile={logoFile}
                savingLogo={savingLogo}
                onUploadLogo={uploadLogo}
                onSave={save}
                saving={saving}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Profile settings are available to clinic admins only.</p>
            )}
          </TabsContent>

          <TabsContent value="branding">
            {clinic && brandingData ? (
              <ClinicBrandingTab clinicId={clinic.id} initialData={brandingData} doctors={brandingData.doctors || []} />
            ) : (
              <p className="text-sm text-muted-foreground">Branding settings are available to clinic admins only.</p>
            )}
          </TabsContent>

          <TabsContent value="features-toggle">
            {clinic ? (
              <FeaturesToggleTab form={form} setForm={setForm} onSave={save} saving={saving} subFeatures={subFeatures} />
            ) : (
              <p className="text-sm text-muted-foreground">Feature toggles are available to clinic admins only.</p>
            )}
          </TabsContent>

          <TabsContent value="working-hours">
            {clinic ? (
              <WorkingHoursTab clinicId={clinic.id} initialValue={clinic.workingHours} />
            ) : (
              <p className="text-sm text-muted-foreground">Working hours are available to clinic admins only.</p>
            )}
          </TabsContent>

          <TabsContent value="keyboard-shortcuts">
            <KeyboardShortcutsTab userType={userType} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
