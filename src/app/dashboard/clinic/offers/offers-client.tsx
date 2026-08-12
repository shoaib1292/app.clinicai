'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Copy, Share2, Loader2, Sparkles, Gift, Users, BarChart3 } from 'lucide-react'

interface Offer {
  id: string
  title: string
  description?: string | null
  type: string
  value: number
  maxDiscount?: number | null
  appliesTo: string
  serviceId?: string | null
  doctorId?: string | null
  promoCode?: string | null
  isReferral: boolean
  startsAt?: string | null
  endsAt?: string | null
  limit?: number | null
  usedCount: number
  active: boolean
  _count?: { redemptions: number }
}

interface ReferralProgramData {
  enabled: boolean
  refereeDiscount: number
  referrerReward: number
}

interface SelectOption {
  id: string
  name: string
}

interface AnalyticsData {
  activeOffers: number
  totalRedemptions: number
  referralBookings: number
  totalRewardsGiven: number
}

interface Props {
  initialOffers: Offer[]
  initialReferralProgram: ReferralProgramData | null
  services: SelectOption[]
  doctors: SelectOption[]
  clinicSlug: string
  initialAnalytics: AnalyticsData
}

const EMPTY_FORM: Record<string, string> = {
  title: '', description: '', type: 'percent', value: '', maxDiscount: '',
  appliesTo: 'all', serviceId: '', doctorId: '', promoCode: '',
  startsAt: '', endsAt: '', limit: '',
}

export function OffersClient({ initialOffers, initialReferralProgram, services, doctors, clinicSlug, initialAnalytics }: Props) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const [referralProgram, setReferralProgram] = useState<ReferralProgramData>(initialReferralProgram || { enabled: true, refereeDiscount: 100, referrerReward: 100 })
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics)
  const [tab, setTab] = useState('offers')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [loading, setLoading] = useState(false)
  const [refLoading, setRefLoading] = useState(false)

  async function save() {
    if (!form.title) { toast.error('Title is required'); return }
    if (form.type === 'percent' && (!form.value || Number(form.value) < 1 || Number(form.value) > 100)) {
      toast.error('Percent value must be between 1 and 100'); return
    }
    if (form.type === 'flat' && (!form.value || Number(form.value) < 1)) {
      toast.error('Flat discount must be at least 1 PKR'); return
    }

    setLoading(true)
    const url = editingId ? `/api/offers/${editingId}` : '/api/offers'
    const method = editingId ? 'PATCH' : 'POST'

    const body: Record<string, unknown> = {
      title: form.title, description: form.description || undefined,
      type: form.type, value: Number(form.value),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      appliesTo: form.appliesTo,
      serviceId: form.serviceId || undefined, doctorId: form.doctorId || undefined,
      promoCode: form.promoCode || undefined,
      startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined,
      limit: form.limit ? Number(form.limit) : undefined,
    }

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    setLoading(false)

    if (!json.ok) { toast.error(json.error || 'Failed to save'); return }

    toast.success(editingId ? 'Offer updated' : 'Offer created')
    setDialogOpen(false)
    setForm({ ...EMPTY_FORM })
    setEditingId(null)

    const fresh = await fetch('/api/offers').then(r => r.json())
    if (fresh.ok) setOffers(fresh.data)
  }

  async function toggleOffer(offer: Offer) {
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, active: !o.active } : o))
    const res = await fetch(`/api/offers/${offer.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !offer.active }),
    })
    if (!res.ok) {
      setOffers(initialOffers)
      toast.error('Failed to toggle offer')
    }
  }

  async function deleteOffer(id: string) {
    setOffers(prev => prev.filter(o => o.id !== id))
    const res = await fetch(`/api/offers/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.ok) toast.success('Offer deleted')
    else { toast.error('Failed to delete'); setOffers(initialOffers) }
  }

  function editOffer(offer: Offer) {
    setEditingId(offer.id)
    setForm({
      ...EMPTY_FORM,
      title: offer.title, description: offer.description || '',
      type: offer.type, value: String(offer.value),
      maxDiscount: offer.maxDiscount ? String(offer.maxDiscount) : '',
      appliesTo: offer.appliesTo,
      serviceId: offer.serviceId || '', doctorId: offer.doctorId || '',
      promoCode: offer.promoCode || '',
      startsAt: offer.startsAt ? new Date(offer.startsAt).toISOString().slice(0, 16) : '',
      endsAt: offer.endsAt ? new Date(offer.endsAt).toISOString().slice(0, 16) : '',
      limit: offer.limit ? String(offer.limit) : '',
    })
    setDialogOpen(true)
  }

  async function saveReferral() {
    setRefLoading(true)
    const res = await fetch('/api/referral/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(referralProgram),
    })
    const json = await res.json()
    setRefLoading(false)
    if (json.ok) toast.success('Referral program saved')
    else toast.error(json.error || 'Failed to save')
  }

  function discountLabel(offer: Offer) {
    if (offer.type === 'percent') {
      if (offer.maxDiscount) return `${offer.value}% off (up to Rs ${offer.maxDiscount})`
      return `${offer.value}% off`
    }
    return `Rs ${offer.value} off`
  }

  function targetLabel(offer: Offer) {
    if (offer.appliesTo === 'new_patients') return 'New patients only'
    if (offer.serviceId) return `Service: ${services.find(s => s.id === offer.serviceId)?.name || 'Specific'}`
    if (offer.doctorId) return `Doctor: ${doctors.find(d => d.id === offer.doctorId)?.name || 'Specific'}`
    return 'All bookings'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offers & Referrals</h1>
        <p className="text-muted-foreground">Create offers, discounts, and referral programs for your patients.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="offers" className="gap-2"><Gift className="w-4 h-4" />Offers</TabsTrigger>
          <TabsTrigger value="referral" className="gap-2"><Users className="w-4 h-4" />Referral Program</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
        </TabsList>

        {/* OFFERS TAB */}
        <TabsContent value="offers" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{offers.length} offer{offers.length !== 1 ? 's' : ''}</p>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm({ ...EMPTY_FORM }) } }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" />Create Offer</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
                  <DialogDescription>
                    {editingId ? 'Update the offer details below.' : 'Set up a new discount or promo offer.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. New Patient 20%" />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Discount Type</Label>
                      <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage</SelectItem>
                          <SelectItem value="flat">Flat (PKR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Value</Label>
                      <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percent' ? '20' : '500'} />
                    </div>
                  </div>
                  {form.type === 'percent' && (
                    <div className="space-y-1">
                      <Label>Max Discount (PKR)</Label>
                      <Input type="number" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} placeholder="Optional cap" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>Applies To</Label>
                    <Select value={form.appliesTo} onValueChange={v => setForm({ ...form, appliesTo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All patients</SelectItem>
                        <SelectItem value="new_patients">New patients only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Service (optional)</Label>
                      <Select value={form.serviceId} onValueChange={v => setForm({ ...form, serviceId: v })}>
                        <SelectTrigger><SelectValue placeholder="Any service" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any service</SelectItem>
                          {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Doctor (optional)</Label>
                      <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}>
                        <SelectTrigger><SelectValue placeholder="Any doctor" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any doctor</SelectItem>
                          {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Promo Code (optional)</Label>
                    <Input value={form.promoCode} onChange={e => setForm({ ...form, promoCode: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Start Date</Label>
                      <Input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>End Date</Label>
                      <Input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Redemption Limit</Label>
                    <Input type="number" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} placeholder="Unlimited" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM }) }}>Cancel</Button>
                  <Button onClick={save} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {editingId ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3">
            {offers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Gift className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-2">No offers created yet.</p>
                  <p className="text-xs text-muted-foreground">Create your first offer to attract new patients.</p>
                </CardContent>
              </Card>
            ) : (
              offers.map(offer => (
                <Card key={offer.id} className={!offer.active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{offer.title}</span>
                          <Badge variant={offer.type === 'percent' ? 'default' : 'secondary'} className="text-xs">
                            {offer.type === 'percent' ? `${offer.value}%` : `PKR ${offer.value}`}
                          </Badge>
                          {offer.promoCode && <Badge variant="outline" className="text-xs font-mono">{offer.promoCode}</Badge>}
                          {offer.isReferral && <Badge variant="outline" className="text-xs">Referral</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{targetLabel(offer)}</p>
                        {offer.limit && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Used: {offer.usedCount} / {offer.limit}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={offer.active} onCheckedChange={() => toggleOffer(offer)} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editOffer(offer)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" onClick={() => deleteOffer(offer.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* REFERRAL PROGRAM TAB */}
        <TabsContent value="referral" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Referral Program</CardTitle>
              <CardDescription>Patients share their referral link. When a new patient uses it and completes an appointment, the referrer earns credit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Referral Program</Label>
                  <p className="text-xs text-muted-foreground">Toggle on to allow patients to refer others</p>
                </div>
                <Switch checked={referralProgram.enabled} onCheckedChange={v => setReferralProgram({ ...referralProgram, enabled: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Referee Discount (PKR)</Label>
                  <Input type="number" value={referralProgram.refereeDiscount} onChange={e => setReferralProgram({ ...referralProgram, refereeDiscount: Number(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground">Discount for the new patient</p>
                </div>
                <div className="space-y-1">
                  <Label>Referrer Reward (PKR)</Label>
                  <Input type="number" value={referralProgram.referrerReward} onChange={e => setReferralProgram({ ...referralProgram, referrerReward: Number(e.target.value) || 0 })} />
                  <p className="text-xs text-muted-foreground">Credit for the existing patient</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Referral Link Preview</Label>
                <div className="flex gap-2">
                  <Input readOnly value={`app.clinicai.pk/r/${clinicSlug}/<code>`} className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`app.clinicai.pk/r/${clinicSlug}`); toast.success('Copied') }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Each patient gets a unique referral code. Share the link structure above — patients get their personal code from their portal.</p>
              </div>
              <Button onClick={saveReferral} disabled={refLoading} className="w-full sm:w-auto">
                {refLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Program
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.activeOffers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Redemptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalRedemptions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Referral Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.referralBookings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rewards Given</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">PKR {analytics.totalRewardsGiven}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
