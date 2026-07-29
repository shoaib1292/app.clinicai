'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Patient { id: string; name: string | null; phone: string }
interface Product { id: string; name: string; salePrice: number; unit: string; totalStock: number }

interface Line { productId: string; quantity: number; unitPrice: number }

export function CounterClient() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [patientId, setPatientId] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0 }])
  const [discount, setDiscount] = useState('0')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [lastSale, setLastSale] = useState<{ id: string; total: number; platformFee: number } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/patients?limit=500').then((r) => r.json()),
      fetch('/api/pharmacy/products?limit=500').then((r) => r.json()),
    ]).then(([p, pr]) => {
      if (p.ok) setPatients((p.data.items || []).map((x: any) => ({ id: x.id, name: x.name, phone: x.phone })))
      if (pr.ok) setProducts(pr.data.items.map((x: any) => ({ id: x.id, name: x.name, salePrice: x.salePrice, unit: x.unit, totalStock: x.totalStock })))
    })
  }, [])

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => {
      const n = [...prev]
      n[idx] = { ...n[idx], ...patch }
      if (patch.productId) {
        const prod = products.find((p) => p.id === patch.productId)
        if (prod) n[idx].unitPrice = prod.salePrice
      }
      return n
    })
  }

  const subtotal = lines.reduce((s, l) => s + (l.unitPrice || 0) * (l.quantity || 0), 0)
  const disc = Number(discount) || 0
  const total = Math.max(0, subtotal - disc)

  async function dispense() {
    const valid = lines.filter((l) => l.productId && l.quantity > 0)
    if (valid.length === 0) { toast.error('Add at least one medicine'); return }
    if (!patientId && !walkInPhone) { toast.error('Select a patient or enter walk-in phone'); return }
    setSaving(true)
    const res = await fetch('/api/pharmacy/sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId || null,
        channel: 'counter',
        paymentMode,
        discount: disc,
        items: valid.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
      }),
    })
    setSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Sale failed'); return }
    toast.success(`Sale recorded · PKR ${json.data.total}` + (json.data.platformFee ? ` (platform fee PKR ${json.data.platformFee})` : ''))
    setLastSale({ id: json.data.saleId, total: json.data.total, platformFee: json.data.platformFee })
    setLines([{ productId: '', quantity: 1, unitPrice: 0 }])
    setPatientId(''); setWalkInPhone(''); setDiscount('0')
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Counter</h1>
          <p className="text-muted-foreground">Pick patient → dispense from stock (FIFO) → bill → receipt.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Existing Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}><SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.phone}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Or Walk-in Phone</Label>
              <Input value={walkInPhone} onChange={(e) => { setWalkInPhone(e.target.value); setPatientId('') }} placeholder="+92..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Medicines</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLines((l) => [...l, { productId: '', quantity: 1, unitPrice: 0 }])}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {lines.map((l, idx) => {
              const prod = products.find((p) => p.id === l.productId)
              return (
                <div key={idx} className="grid grid-cols-[1fr_80px_110px_32px] gap-2 items-center">
                  <Select value={l.productId} onValueChange={(v) => setLine(idx, { productId: v })}>
                    <SelectTrigger><SelectValue placeholder="Medicine" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.totalStock} {p.unit})</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min={1} value={l.quantity} onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })} />
                  <Input type="number" value={l.unitPrice} onChange={(e) => setLine(idx, { unitPrice: Number(e.target.value) })} />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></Button>
                  {prod && prod.totalStock <= 0 && <div className="col-span-4 text-xs text-destructive">Out of stock</div>}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-6">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="size-4" />Bill</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>PKR {subtotal}</span></div>
            <div className="space-y-2">
              <Label>Discount (PKR)</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>PKR {total}</span></div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="online">Online</SelectItem></SelectContent></Select>
            </div>
            <Button className="w-full" onClick={dispense} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Dispense & Bill</Button>
            {lastSale && (
              <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                <div className="font-medium">Last receipt</div>
                <div>Sale #{lastSale.id.slice(-6)} · PKR {lastSale.total}</div>
                {lastSale.platformFee > 0 && <div className="text-xs text-muted-foreground">Platform fee: PKR {lastSale.platformFee} (extra)</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
