'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Bot, Phone, Pill, PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { SettingsForm } from './clinic-profile-tab'

interface Props {
  form: SettingsForm
  setForm: (form: SettingsForm) => void
  onSave: () => void
  saving: boolean
  subFeatures?: Record<string, boolean>
}

// Sub-toggles per module (key -> label/description). The pharmacy master switch
// gates a set of sub-features so a clinic can turn on exactly what it needs.
const PHARMACY_SUBTOGGLES: { key: string; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'inventory', label: 'Inventory & Stock', description: 'Batch/expiry tracking, low-stock alerts, purchase orders.', icon: PackageSearch },
  { key: 'suppliers', label: 'Suppliers & Purchases', description: 'Vendor list and purchase/receive workflow.', icon: Pill },
  { key: 'prescriptions', label: 'Prescriptions', description: 'Doctor-written Rx linked to appointments or walk-ins.', icon: Pill },
  { key: 'counter', label: 'Pharmacy Counter (Dispensing)', description: 'The sale screen: dispense from stock → bill → receipt.', icon: Pill },
  { key: 'reports', label: 'Pharmacy Reports', description: 'Sales, margin, expiry losses, top movers, stock valuation.', icon: Pill },
]

export function FeaturesToggleTab({ form, setForm, onSave, saving, subFeatures }: Props) {
  const [subToggles, setSubToggles] = useState<Record<string, boolean>>({
    inventory: subFeatures ? !!subFeatures.inventory : form.inventoryEnabled,
    suppliers: !!subFeatures?.suppliers,
    prescriptions: !!subFeatures?.prescriptions,
    counter: !!subFeatures?.counter,
    reports: !!subFeatures?.reports,
  })

  async function setFeature(key: string, enabled: boolean) {
    try {
      const res = await fetch('/api/clinic-features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed to update'); return false }
      return true
    } catch {
      toast.error('Network error')
      return false
    }
  }

  async function togglePharmacy(v: boolean) {
    setForm({ ...form, pharmacyEnabled: v })
    // Turning the master switch off also collapses sub-features.
    if (!v) setSubToggles((s) => ({ ...s, inventory: false, suppliers: false, prescriptions: false, counter: false, reports: false }))
    const okFlag = await setFeature('pharmacy', v)
    if (!okFlag) setForm({ ...form, pharmacyEnabled: !v })
  }

  async function toggleSub(key: string, v: boolean) {
    if (key === 'inventory') setForm({ ...form, inventoryEnabled: v })
    setSubToggles((s) => ({ ...s, [key]: v }))
    const okFlag = await setFeature(key, v)
    if (!okFlag) {
      if (key === 'inventory') setForm({ ...form, inventoryEnabled: !v })
      setSubToggles((s) => ({ ...s, [key]: !v }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature Toggles</CardTitle>
        <CardDescription>Turn modules on or off. The Pharmacy module adds in-house dispensary / medical-store features.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-md border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-brand" />
            <div>
              <div className="font-medium">AI Agent</div>
              <div className="text-xs text-muted-foreground">When off, all WhatsApp messages queue for staff to handle manually.</div>
            </div>
          </div>
          <Switch checked={form.agentEnabled} onCheckedChange={(v) => setForm({ ...form, agentEnabled: v })} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-md border">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand" />
            <div>
              <div className="font-medium">Online Payments</div>
              <div className="text-xs text-muted-foreground">Patients can upload transfer screenshots for receptionist confirmation.</div>
            </div>
          </div>
          <Switch checked={form.onlinePaymentsEnabled} onCheckedChange={(v) => setForm({ ...form, onlinePaymentsEnabled: v })} />
        </div>

        {/* Pharmacy master switch */}
        <div className="rounded-md border border-primary/30 bg-primary/[0.03] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-brand" />
              <div>
                <div className="font-medium">Pharmacy Module</div>
                <div className="text-xs text-muted-foreground">In-house dispensary, medical store, flexible billing ("hisab kitab").</div>
              </div>
            </div>
            <Switch checked={form.pharmacyEnabled} onCheckedChange={togglePharmacy} />
          </div>

          {form.pharmacyEnabled && (
            <div className="pl-6 space-y-2 border-l border-border/60">
              {PHARMACY_SUBTOGGLES.map((t) => {
                const Icon = t.icon
                return (
                  <div key={t.key} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </div>
                    <Switch checked={subToggles[t.key] ?? false} onCheckedChange={(v) => toggleSub(t.key, v)} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </Card>
  )
}
