'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CreditCard, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Rule {
  id: string
  scope: string
  clinicId: string | null
  platformFeeDefault: number
  platformFeeOverride: number | null
  extraClinicFeeMin: number
  extraClinicFeeMax: number
  billingMode: string
  clinic: { id: string; name: string; slug: string } | null
}
interface Clinic { id: string; name: string; slug: string }

export function PricingClient({ initialRules, clinics }: { initialRules: Rule[]; clinics: Clinic[] }) {
  const [rules, setRules] = useState(initialRules)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ scope: 'clinic', clinicId: '', platformFeeDefault: '50', platformFeeOverride: '', extraClinicFeeMin: '0', extraClinicFeeMax: '500', billingMode: 'credit' })

  async function add() {
    setLoading(true)
    const res = await fetch('/api/pricing-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: form.scope,
        clinicId: form.scope === 'clinic' ? form.clinicId : null,
        platformFeeDefault: Number(form.platformFeeDefault),
        platformFeeOverride: form.platformFeeOverride ? Number(form.platformFeeOverride) : null,
        extraClinicFeeMin: Number(form.extraClinicFeeMin),
        extraClinicFeeMax: Number(form.extraClinicFeeMax),
        billingMode: form.billingMode,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Pricing rule created')
    setOpen(false)
    const fresh = await fetch('/api/pricing-rules').then((r) => r.json())
    if (fresh.ok) setRules(fresh.data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pricing Rules</h1>
          <p className="text-muted-foreground">Platform fee (default PKR 50) + per-clinic overrides + extra-clinic-fee bounds</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Rule</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Pricing Rule</DialogTitle><DialogDescription>Override the global platform fee per clinic, or set a new global default.</DialogDescription></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (all clinics)</SelectItem>
                    <SelectItem value="clinic">Per-clinic override</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.scope === 'clinic' && (
                <div className="space-y-2">
                  <Label>Clinic</Label>
                  <Select value={form.clinicId} onValueChange={(v) => setForm({ ...form, clinicId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select clinic" /></SelectTrigger>
                    <SelectContent>
                      {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Platform Fee Default (PKR)</Label>
                  <Input type="number" value={form.platformFeeDefault} onChange={(e) => setForm({ ...form, platformFeeDefault: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Platform Fee Override (optional)</Label>
                  <Input type="number" value={form.platformFeeOverride} onChange={(e) => setForm({ ...form, platformFeeOverride: e.target.value })} placeholder="empty = use default" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Extra Fee Min (PKR)</Label>
                  <Input type="number" value={form.extraClinicFeeMin} onChange={(e) => setForm({ ...form, extraClinicFeeMin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Extra Fee Max (PKR)</Label>
                  <Input type="number" value={form.extraClinicFeeMax} onChange={(e) => setForm({ ...form, extraClinicFeeMax: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Billing Mode</Label>
                <Select value={form.billingMode} onValueChange={(v) => setForm({ ...form, billingMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit-based (pay-as-you-go)</SelectItem>
                    <SelectItem value="invoice">Monthly invoice</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={add} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}Save Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fee Model Summary</CardTitle>
          <CardDescription>Patient pays: doctor_fee + extra_clinic_fee + platform_fee</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-md bg-muted/40">
            <div className="font-medium">Platform Fee</div>
            <div className="text-xs text-muted-foreground">Set by platform admin. Floor PKR 0 (promo). Default PKR 50. Patient pays → clinic settles with platform.</div>
          </div>
          <div className="p-3 rounded-md bg-muted/40">
            <div className="font-medium">Extra Clinic Fee</div>
            <div className="text-xs text-muted-foreground">Set by clinic admin. 0 to platform-defined max (default 500). Patient pays → clinic keeps.</div>
          </div>
          <div className="p-3 rounded-md bg-muted/40">
            <div className="font-medium">Doctor Fee</div>
            <div className="text-xs text-muted-foreground">Set by clinic admin per Service. No platform bound. Patient pays → clinic/doctor keeps.</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {rules.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Badge variant={r.scope === 'global' ? 'default' : 'secondary'} className="capitalize">{r.scope}</Badge>
                  {r.clinic?.name || 'All clinics'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Platform fee: <span className="font-medium text-foreground">PKR {r.platformFeeOverride ?? r.platformFeeDefault}</span>
                  {r.platformFeeOverride && <span className="text-muted-foreground"> (override of {r.platformFeeDefault})</span>}
                  {' · '}Extra bounds: PKR {r.extraClinicFeeMin}–{r.extraClinicFeeMax}
                  {' · '}Billing: {r.billingMode}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
