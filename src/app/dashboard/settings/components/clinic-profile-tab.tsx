'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneField } from '@/components/ui/phone-field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Building2 } from 'lucide-react'

export interface SettingsForm {
  name: string
  city: string
  phone: string
  whatsappNumber: string
  address: string
  timezone: string
  currency: string
  onlinePaymentsEnabled: boolean
  agentEnabled: boolean
  pharmacyEnabled: boolean
  inventoryEnabled: boolean
  combineFees: boolean
}

interface Props {
  clinicId: string
  form: SettingsForm
  setForm: (form: SettingsForm) => void
  logoUrl: string | null
  setLogoFile: (file: File | null) => void
  logoFile: File | null
  savingLogo: boolean
  onUploadLogo: () => void
  onSave: () => void
  saving: boolean
}

export function ClinicProfileTab({ clinicId, form, setForm, logoUrl, setLogoFile, logoFile, savingLogo, onUploadLogo, onSave, saving }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-brand" />Clinic Logo</CardTitle>
          <CardDescription>Hospital/clinic logo shown across the platform. Stored on Cloudinary.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Clinic logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            <Button onClick={onUploadLogo} disabled={!logoFile || savingLogo}>
              {savingLogo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Upload Logo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-brand" />Clinic Profile</CardTitle>
          <CardDescription>Basic information about your clinic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Karachi" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <PhoneField value={form.whatsappNumber} onChange={(v) => setForm({ ...form, whatsappNumber: v })} required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Landline / calling number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full clinic address" />
          </div>

          <div className="space-y-2">
            <Label>Clinic ID</Label>
            <Input value={clinicId} readOnly disabled className="font-mono text-xs text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Read-only identifier. Contact support and share this ID when raising a ticket.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional</CardTitle>
          <CardDescription>Timezone and currency affect reminder timing and fee display.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Karachi">Asia/Karachi (PKT, UTC+5)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PKR">PKR — Pakistani Rupee</SelectItem>
                <SelectItem value="USD">USD — US Dollar</SelectItem>
                <SelectItem value="AED">AED — UAE Dirham</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5 pr-4">
              <Label>Combine doctor fee into appointment line</Label>
              <p className="text-xs text-muted-foreground">When ON, patient bills show one line &quot;Appointment with Dr X: PKR total&quot; instead of separate doctor + appointment fees.</p>
            </div>
            <Switch checked={form.combineFees} onCheckedChange={(v) => setForm({ ...form, combineFees: v })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
