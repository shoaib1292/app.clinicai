'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChronoSelect, isoToDate, dateToIso } from '@/components/ui/chrono-select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, PackageSearch, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Batch {
  id: string
  batchNo: string | null
  expiry: string | null
  quantity: number
  costPrice: number
  product: { id: string; name: string; reorderLevel: number; form: string; unit: string }
  supplier: { id: string; name: string } | null
}
interface Product { id: string; name: string; unit: string }

export function InventoryClient() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ productId: '', batchNo: '', expiry: '', quantity: '1', costPrice: '0', supplierId: '' })
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'low') params.set('low', '1')
      if (filter === 'expiring') params.set('expiring', '1')
      const [b, p, s] = await Promise.all([
        fetch(`/api/pharmacy/stock?${params.toString()}`).then((r) => r.json()),
        fetch('/api/pharmacy/products?limit=500').then((r) => r.json()),
        fetch('/api/pharmacy/suppliers').then((r) => r.json()),
      ])
      if (b.ok) setBatches(b.data)
      if (p.ok) setProducts(p.data.items.map((x: any) => ({ id: x.id, name: x.name, unit: x.unit })))
      if (s.ok) setSuppliers(s.data)
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function stockIn() {
    if (!form.productId || !form.quantity) { toast.error('Product and quantity required'); return }
    setSaving(true)
    const res = await fetch('/api/pharmacy/stock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: form.productId, batchNo: form.batchNo || null, expiry: form.expiry || null, quantity: Number(form.quantity), costPrice: Number(form.costPrice), supplierId: form.supplierId || null }),
    })
    setSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Stock added')
    setOpen(false)
    setForm({ productId: '', batchNo: '', expiry: '', quantity: '1', costPrice: '0', supplierId: '' })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory / Stock</h1>
          <p className="text-muted-foreground">Live stock across batches, low-stock & expiry alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="expiring">Expiring (90d)</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm({ productId: '', batchNo: '', expiry: '', quantity: '1', costPrice: '0', supplierId: '' }) }}>
                <Plus className="w-4 h-4 mr-2" /> Stock In
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stock (Stock-In)</DialogTitle>
                <DialogDescription>Creates a batch with optional batch no + expiry.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-2"><Label>Medicine *</Label>
                  <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Batch No</Label><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Expiry</Label><ChronoSelect value={isoToDate(form.expiry)} onChange={(d) => setForm({ ...form, expiry: dateToIso(d) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Cost/unit (PKR)</Label><Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Supplier</Label>
                  <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={stockIn} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Add Stock</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto" /></div>
          ) : batches.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2"><PackageSearch className="size-8" />No stock batches.</div>
          ) : (
            <div className="divide-y">
              {batches.map((b) => {
                const low = b.product.reorderLevel > 0 && b.quantity <= b.product.reorderLevel
                const expiring = b.expiry && new Date(b.expiry).getTime() < Date.now() + 90 * 864e5
                return (
                  <div key={b.id} className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{b.product.name}</div>
                      <div className="text-xs text-muted-foreground">Batch {b.batchNo || '—'} · {b.supplier?.name || 'no supplier'} · cost PKR {b.costPrice}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{b.quantity} {b.product.unit}</div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {low && <Badge variant="destructive"><AlertTriangle className="size-3 mr-1" />Low</Badge>}
                        {expiring && <Badge variant="secondary">Expiry {new Date(b.expiry!).toLocaleDateString()}</Badge>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
