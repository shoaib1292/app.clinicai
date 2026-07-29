'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface Rx {
  id: string; patient: { name: string | null; phone: string }; doctor: { name: string } | null; notes: string | null; createdAt: string;
  items: { id: string; quantity: number; dosage: string | null; product: { name: string; form: string; unit: string } }[];
}
interface Patient { id: string; name: string | null; phone: string }
interface Product { id: string; name: string; unit: string }

export function PrescriptionsClient() {
  const [rxs, setRxs] = useState<Rx[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ patientId: '', notes: '', items: [{ productId: '', quantity: '1', dosage: '' }] })

  async function load() {
    const [r, p, pr] = await Promise.all([
      fetch('/api/pharmacy/prescriptions').then((x) => x.json()),
      fetch('/api/patients?limit=500').then((x) => x.json()),
      fetch('/api/pharmacy/products?limit=500').then((x) => x.json()),
    ])
    if (r.ok) setRxs(r.data)
    if (p.ok) setPatients((p.data.items || []).map((x: any) => ({ id: x.id, name: x.name, phone: x.phone })))
    if (pr.ok) setProducts(pr.data.items.map((x: any) => ({ id: x.id, name: x.name, unit: x.unit })))
  }
  useEffect(() => { load() }, [])

  async function createRx() {
    const valid = form.items.filter((i) => i.productId)
    if (!form.patientId || valid.length === 0) { toast.error('Patient and at least one medicine required'); return }
    setSaving(true)
    const res = await fetch('/api/pharmacy/prescriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: form.patientId, notes: form.notes || null, items: valid.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), dosage: i.dosage || null })) }),
    })
    setSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Prescription created'); setOpen(false); setForm({ patientId: '', notes: '', items: [{ productId: '', quantity: '1', dosage: '' }] }); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">Doctor-written Rx linked to appointment or walk-in.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Rx</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Prescription</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2"><Label>Patient *</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.phone}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                  <div className="col-span-3 space-y-1"><Label>Medicine</Label>
                    <Select value={it.productId} onValueChange={(v) => { const n = [...form.items]; n[idx].productId = v; setForm({ ...form, items: n }) }}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Qty</Label><Input type="number" value={it.quantity} onChange={(e) => { const n = [...form.items]; n[idx].quantity = e.target.value; setForm({ ...form, items: n }) }} /></div>
                  <div className="col-span-2 space-y-1"><Label>Dosage</Label><Input value={it.dosage} placeholder="1x2 for 5 days" onChange={(e) => { const n = [...form.items]; n[idx].dosage = e.target.value; setForm({ ...form, items: n }) }} /></div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { productId: '', quantity: '1', dosage: '' }] })}>+ Add medicine</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createRx} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Create Rx</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {rxs.length === 0 ? <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2"><FileText className="size-8" />No prescriptions yet.</div> :
            <div className="divide-y">{rxs.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.patient.name || r.patient.phone}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                {r.doctor && <div className="text-xs text-muted-foreground">Dr. {r.doctor.name}</div>}
                {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.items.map((i) => <Badge key={i.id} variant="secondary">{i.product.name} ×{i.quantity}{i.dosage ? ` (${i.dosage})` : ''}</Badge>)}
                </div>
              </div>
            ))}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
