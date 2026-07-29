'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChronoSelect, isoToDate, dateToIso } from '@/components/ui/chrono-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Truck } from 'lucide-react'
import { toast } from 'sonner'

interface Supplier { id: string; name: string; contact: string | null; city: string | null; _count: { batches: number; purchaseOrders: number } }
interface PO { id: string; invoiceNo: string | null; status: string; total: number; createdAt: string; supplier: { id: string; name: string } | null; items: { id: string; quantity: number; unitCost: number; product: { name: string; unit: string } }[] }

export function SuppliersClient() {
  const [tab, setTab] = useState<'suppliers' | 'purchases'>('suppliers')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pos, setPos] = useState<PO[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; unit: string }[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supForm, setSupForm] = useState({ name: '', contact: '', city: '' })
  const [poForm, setPoForm] = useState({ supplierId: '', status: 'received', items: [{ productId: '', quantity: '1', unitCost: '0', batchNo: '', expiry: '' }] })

  async function load() {
    const [s, p, pr] = await Promise.all([
      fetch('/api/pharmacy/suppliers').then((r) => r.json()),
      fetch('/api/pharmacy/purchases').then((r) => r.json()),
      fetch('/api/pharmacy/products?limit=500').then((r) => r.json()),
    ])
    if (s.ok) setSuppliers(s.data)
    if (p.ok) setPos(p.data)
    if (pr.ok) setProducts(pr.data.items.map((x: any) => ({ id: x.id, name: x.name, unit: x.unit })))
  }
  useEffect(() => { load() }, [])

  async function addSupplier() {
    if (!supForm.name) { toast.error('Name required'); return }
    setSaving(true)
    const res = await fetch('/api/pharmacy/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) })
    setSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Supplier added'); setOpen(false); setSupForm({ name: '', contact: '', city: '' }); load()
  }

  async function addPO() {
    const valid = poForm.items.filter((i) => i.productId)
    if (valid.length === 0) { toast.error('Add at least one item'); return }
    setSaving(true)
    const res = await fetch('/api/pharmacy/purchases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId: poForm.supplierId || null, status: poForm.status, items: valid.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), unitCost: Number(i.unitCost), batchNo: i.batchNo || null, expiry: i.expiry || null })) }),
    })
    setSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success(poForm.status === 'received' ? 'Purchase received & stocked' : 'Purchase order saved')
    setOpen(false); setPoForm({ supplierId: '', status: 'received', items: [{ productId: '', quantity: '1', unitCost: '0', batchNo: '', expiry: '' }] }); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers & Purchases</h1>
          <p className="text-muted-foreground">Vendor list and purchase orders.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />{tab === 'suppliers' ? 'Add Supplier' : 'New Purchase'}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{tab === 'suppliers' ? 'Add Supplier' : 'New Purchase Order'}</DialogTitle></DialogHeader>
            {tab === 'suppliers' ? (
              <div className="grid gap-3 py-2">
                <div className="space-y-2"><Label>Name *</Label><Input value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contact</Label><Input value={supForm.contact} onChange={(e) => setSupForm({ ...supForm, contact: e.target.value })} /></div>
                <div className="space-y-2"><Label>City</Label><Input value={supForm.city} onChange={(e) => setSupForm({ ...supForm, city: e.target.value })} /></div>
              </div>
            ) : (
              <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2"><Label>Supplier</Label>
                  <Select value={poForm.supplierId} onValueChange={(v) => setPoForm({ ...poForm, supplierId: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={poForm.status} onValueChange={(v) => setPoForm({ ...poForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="received">Receive now (stock in)</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
                  </Select>
                </div>
                {poForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                    <div className="space-y-1 col-span-2"><Label>Medicine</Label>
                      <Select value={it.productId} onValueChange={(v) => { const n = [...poForm.items]; n[idx].productId = v; setPoForm({ ...poForm, items: n }) }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Qty</Label><Input type="number" value={it.quantity} onChange={(e) => { const n = [...poForm.items]; n[idx].quantity = e.target.value; setPoForm({ ...poForm, items: n }) }} /></div>
                    <div className="space-y-1"><Label>Unit Cost</Label><Input type="number" value={it.unitCost} onChange={(e) => { const n = [...poForm.items]; n[idx].unitCost = e.target.value; setPoForm({ ...poForm, items: n }) }} /></div>
                    <div className="space-y-1"><Label>Batch</Label><Input value={it.batchNo} onChange={(e) => { const n = [...poForm.items]; n[idx].batchNo = e.target.value; setPoForm({ ...poForm, items: n }) }} /></div>
                    <div className="space-y-1"><Label>Expiry</Label><ChronoSelect value={isoToDate(it.expiry)} onChange={(d) => { const n = [...poForm.items]; n[idx].expiry = dateToIso(d); setPoForm({ ...poForm, items: n }) }} /></div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { productId: '', quantity: '1', unitCost: '0', batchNo: '', expiry: '' }] })}>+ Add item</Button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={tab === 'suppliers' ? addSupplier : addPO} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'suppliers' ? 'default' : 'outline'} size="sm" onClick={() => setTab('suppliers')}>Suppliers</Button>
        <Button variant={tab === 'purchases' ? 'default' : 'outline'} size="sm" onClick={() => setTab('purchases')}>Purchases</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {tab === 'suppliers' ? (
            suppliers.length === 0 ? <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2"><Truck className="size-8" />No suppliers yet.</div> :
            <div className="divide-y">{suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.contact || '—'} · {s.city || '—'}</div></div>
                <div className="text-xs text-muted-foreground">{s._count.purchaseOrders} POs</div>
              </div>
            ))}</div>
          ) : (
            pos.length === 0 ? <div className="p-10 text-center text-muted-foreground">No purchases yet.</div> :
            <div className="divide-y">{pos.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.supplier?.name || 'Walk-in PO'} {p.invoiceNo ? `· #${p.invoiceNo}` : ''}</div>
                  <div className="flex items-center gap-2"><Badge variant={p.status === 'received' ? 'default' : 'secondary'}>{p.status}</Badge><span className="text-sm font-medium">PKR {p.total}</span></div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.items.length} items · {new Date(p.createdAt).toLocaleDateString()}</div>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
