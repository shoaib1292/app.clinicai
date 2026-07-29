'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Search, Building2, MapPin, Phone, Wallet, CalendarDays, Users, Activity } from 'lucide-react'
import { toast } from 'sonner'

interface ClinicRow {
  id: string
  name: string
  slug: string
  city: string | null
  status: string
  agentEnabled: boolean
  agentName: string
  agentGender: string
  onlinePaymentsEnabled: boolean
  evolutionConnected: boolean
  metaConnected: boolean
  creditBalance: number
  settlementMode: string
  createdAt: Date
  _count: { appointments: number; doctors: number; patients: number }
  agentToggle: { enabled: boolean; pausedReason: string | null } | null
}

export function ClinicsListClient({ initialClinics }: { initialClinics: ClinicRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [clinics, setClinics] = useState(initialClinics)

  const filtered = clinics.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())
    const matchStatus = status === 'all' || c.status === status
    return matchSearch && matchStatus
  })

  async function toggleAgent(clinic: ClinicRow) {
    const newEnabled = !clinic.agentEnabled
    // Optimistic
    setClinics((prev) => prev.map((c) => c.id === clinic.id ? { ...c, agentEnabled: newEnabled } : c))
    const res = await fetch(`/api/clinics/${clinic.id}/toggle-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newEnabled, reason: 'Toggled from platform dashboard' }),
    })
    const json = await res.json()
    if (!json.ok) {
      toast.error(json.error || 'Failed to toggle')
      setClinics((prev) => prev.map((c) => c.id === clinic.id ? { ...c, agentEnabled: !newEnabled } : c))
      return
    }
    toast.success(`Agent ${newEnabled ? 'enabled' : 'paused'} for ${clinic.name}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clinics</h1>
          <p className="text-muted-foreground">{clinics.length} clinics on the platform</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-brand-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</div>
                  </div>
                </div>
                <Badge variant={c.status === 'active' ? 'default' : c.status === 'trial' ? 'secondary' : 'destructive'} className="text-xs capitalize">{c.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-md bg-muted/40">
                  <div className="text-lg font-bold">{c._count.appointments}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CalendarDays className="w-3 h-3" />Appts</div>
                </div>
                <div className="p-2 rounded-md bg-muted/40">
                  <div className="text-lg font-bold">{c._count.doctors}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="w-3 h-3" />Doctors</div>
                </div>
                <div className="p-2 rounded-md bg-muted/40">
                  <div className="text-lg font-bold">{c._count.patients}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Activity className="w-3 h-3" />Patients</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {c.evolutionConnected && <Badge variant="outline" className="text-xs">QR/Evo</Badge>}
                {c.metaConnected && <Badge variant="outline" className="text-xs">Meta Official</Badge>}
                {c.onlinePaymentsEnabled && <Badge variant="outline" className="text-xs">Online Pay</Badge>}
                <Badge variant="outline" className="text-xs capitalize">{c.settlementMode}</Badge>
                <Badge variant="outline" className="text-xs">PKR {c.creditBalance.toLocaleString()}</Badge>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">AI Agent: <span className="text-foreground font-medium">{c.agentName}</span> ({c.agentGender})</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{c.agentEnabled ? 'On' : 'Off'}</span>
                  <Switch checked={c.agentEnabled} onCheckedChange={() => toggleAgent(c)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No clinics match your filters.</div>
      )}
    </div>
  )
}
