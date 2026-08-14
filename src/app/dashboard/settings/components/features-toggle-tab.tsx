'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Loader2, Bot, Phone, Pill, PackageSearch } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { SettingsForm } from './clinic-profile-tab'

interface Props {
  clinicId: string
  form: SettingsForm
  setForm: (form: SettingsForm | ((prev: SettingsForm) => SettingsForm)) => void
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

export function FeaturesToggleTab({ clinicId, form, setForm }: Props) {
  const [subToggles, setSubToggles] = useState<Record<string, boolean>>({
    inventory: form.inventoryEnabled,
    suppliers: true,
    prescriptions: true,
    counter: true,
    reports: true,
  })
  const [busy, setBusy] = useState<string | null>(null)

  // Fresh server state is the source of truth: re-sync master + sub toggles on
  // mount so toggles flipped elsewhere (or pharmacy row-vs-column drift) show
  // correctly instead of going stale from server-rendered props.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/clinic-features')
        const json = await res.json()
        if (cancelled || !json.ok || !Array.isArray(json.data)) return
        const map: Record<string, boolean> = {}
        for (const row of json.data as Array<{ key: string; enabled: boolean }>) {
          map[row.key] = row.enabled
        }
        setSubToggles({
          inventory: map.inventory ?? false,
          suppliers: map.suppliers ?? true,
          prescriptions: map.prescriptions ?? true,
          counter: map.counter ?? true,
          reports: map.reports ?? true,
        })
        setForm((f) => ({
          ...f,
          pharmacyEnabled: map.pharmacy ?? f.pharmacyEnabled,
          inventoryEnabled: map.inventory ?? f.inventoryEnabled,
        }))
      } catch {
        /* keep initial state on network failure */
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function setFeature(key: string, enabled: boolean) {
    try {
      const res = await fetch('/api/clinic-features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Failed to update feature')
        return false
      }
      return true
    } catch {
      toast.error('Network error — feature not updated')
      return false
    }
  }

  async function patchClinic(patch: Record<string, unknown>) {
    const res = await fetch(`/api/clinics/${clinicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Save failed')
    return json
  }

  async function toggleAgent(v: boolean) {
    setBusy('agent')
    try {
      await patchClinic({ agentEnabled: v })
      setForm({ ...form, agentEnabled: v })
      toast.success(v ? 'AI Agent enabled' : 'AI Agent disabled')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update AI Agent')
    } finally {
      setBusy(null)
    }
  }

  async function toggleOnlinePayments(v: boolean) {
    setBusy('online_payments')
    try {
      await patchClinic({ onlinePaymentsEnabled: v })
      setForm({ ...form, onlinePaymentsEnabled: v })
      toast.success(v ? 'Online Payments enabled' : 'Online Payments disabled')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update Online Payments')
    } finally {
      setBusy(null)
    }
  }

  async function togglePharmacy(v: boolean) {
    setBusy('pharmacy')
    setForm({ ...form, pharmacyEnabled: v })
    const okFlag = await setFeature('pharmacy', v)
    if (!okFlag) setForm({ ...form, pharmacyEnabled: !v })
    else toast.success(v ? 'Pharmacy Module enabled' : 'Pharmacy Module disabled')
    setBusy(null)
  }

  async function toggleSub(key: string, v: boolean) {
    setBusy(key)
    if (key === 'inventory') setForm({ ...form, inventoryEnabled: v })
    setSubToggles((s) => ({ ...s, [key]: v }))
    const okFlag = await setFeature(key, v)
    if (!okFlag) {
      if (key === 'inventory') setForm({ ...form, inventoryEnabled: !v })
      setSubToggles((s) => ({ ...s, [key]: !v }))
    }
    setBusy(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature Toggles</CardTitle>
        <CardDescription>
          Turn modules on or off. Changes save automatically — the Pharmacy module adds in-house dispensary / medical-store features.
        </CardDescription>
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
          <div className="flex items-center gap-2">
            {busy === 'agent' && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch checked={form.agentEnabled} onCheckedChange={toggleAgent} disabled={busy === 'agent'} />
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md border">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand" />
            <div>
              <div className="font-medium">Online Payments</div>
              <div className="text-xs text-muted-foreground">Patients can upload transfer screenshots for receptionist confirmation.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {busy === 'online_payments' && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch checked={form.onlinePaymentsEnabled} onCheckedChange={toggleOnlinePayments} disabled={busy === 'online_payments'} />
          </div>
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
            <div className="flex items-center gap-2">
              {busy === 'pharmacy' && <Loader2 className="h-4 w-4 animate-spin" />}
              <Switch checked={form.pharmacyEnabled} onCheckedChange={togglePharmacy} disabled={busy === 'pharmacy'} />
            </div>
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
                    <div className="flex items-center gap-2">
                      {busy === t.key && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch checked={subToggles[t.key] ?? false} onCheckedChange={(v) => toggleSub(t.key, v)} disabled={busy === t.key} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
