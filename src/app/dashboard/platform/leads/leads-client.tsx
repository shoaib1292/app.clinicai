'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, MapPin, Calendar, TrendingUp, User } from 'lucide-react'
import { toast } from 'sonner'

interface Lead {
  id: string
  clinicName: string
  adminName: string
  whatsappNumber: string
  city: string
  monthlyAppointments: number | null
  status: string
  notes: string | null
  claimedBy: { name: string } | null
  clinic: { name: string } | null
  createdAt: Date
}
interface Staff { id: string; name: string }
interface Clinic { id: string; name: string }

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  new: 'default', contacted: 'secondary', demo_booked: 'secondary', converted: 'default', lost: 'destructive',
}

export function LeadsClient({ initialLeads, salesStaff, clinics, canManage }: { initialLeads: Lead[]; salesStaff: Staff[]; clinics: Clinic[]; canManage: boolean }) {
  const [leads, setLeads] = useState(initialLeads)

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
    toast.success(`Lead marked as ${status}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">Captured from the landing page form — claim, contact, convert</p>
      </div>

      <div className="grid gap-3">
        {leads.map((l) => (
          <Card key={l.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{l.clinicName}</span>
                    <Badge variant={statusColors[l.status] || 'secondary'} className="capitalize">{l.status.replace('_', ' ')}</Badge>
                    {l.claimedBy && <Badge variant="outline" className="text-xs">Claimed by {l.claimedBy.name}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{l.adminName}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{l.whatsappNumber}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.city}</span>
                    {l.monthlyAppointments && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />~{l.monthlyAppointments}/mo</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(l.createdAt).toLocaleDateString('en-PK')}</span>
                  </div>
                  {l.notes && <div className="text-xs text-muted-foreground mt-1 italic">{l.notes}</div>}
                </div>
                {canManage && (
                  <div className="flex gap-1.5 flex-wrap">
                    {l.status === 'new' && <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, 'contacted')}>Mark Contacted</Button>}
                    {l.status === 'contacted' && <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, 'demo_booked')}>Book Demo</Button>}
                    {l.status === 'demo_booked' && <Button size="sm" onClick={() => updateStatus(l.id, 'converted')}>Convert</Button>}
                    {l.status !== 'lost' && l.status !== 'converted' && <Button size="sm" variant="ghost" onClick={() => updateStatus(l.id, 'lost')}>Mark Lost</Button>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {leads.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">No leads yet. The landing page form will capture them.</CardContent></Card>}
      </div>
    </div>
  )
}
