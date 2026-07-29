'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  genericName: string | null
  brand: string | null
  form: string
  strength: string | null
  unit: string
  purchasePrice: number
  salePrice: number
  taxRate: number
  reorderLevel: number
  active: boolean
  totalStock: number
}

const FORMS = ['tablet', 'syrup', 'capsule', 'injection', 'cream', 'equipment']
const UNITS = ['strip', 'box', 'vial', 'piece']

export function MedicinesClient() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', genericName: '', brand: '', form: 'tablet', strength: '', unit: 'strip',
    purchasePrice: '0', salePrice: '0', taxRate: '0', reorderLevel: '0',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/pharmacy/products?q=${encodeURIComponent(q)}&active=0`)
      const json = await res.json()
      if (json.ok) setProducts(json.data.items)
    } finally { setLoading(false) }
  }, [q])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', genericName: '', brand: '', form: 'tablet', strength: '', unit: 'strip', purchasePrice: '0', salePrice: '0', taxRate: '0', reorderLevel: '0' })
    setOpen(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name, genericName: p.genericName || '', brand: p.brand || '', form: p.form, strength: p.strength || '',
      unit: p.unit, purchasePrice: String(p.purchasePrice), salePrice: String(p.salePrice), taxRate: String(p.taxRate), reorderLevel: String(p.reorderLevel),
    })
    setOpen(true)
  }

  async function save() {
    if (!form.name) { toast.error('Name required'); return }
    setSaving(true)
    const body = {
      name: form.name, genericName: form.genericName || null, brand: form.brand || null, form: form.form,
      strength: form.strength || null, unit: form.unit, purchasePrice: Number(form.purchasePrice), salePrice: Number(form.salePrice),
      taxRate: Number(form.taxRate), reorderLevel: Number(form.reorderLevel),
    }
    const res = await fetch(
      editing ? `/api/pharmacy/products/${editing.id}` : '/api/pharmacy/products',
      { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    setSaving(false)
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success(editing ? 'Medicine updated' : 'Medicine added')
    setOpen(false)
    load()
  }

  async function remove(p: Product) {
    if (!confirm(`Delete ${p.name}?`)) return
    const res = await fetch(`/api/pharmacy/products/${p.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Deleted')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medicines (Catalog)</h1>
          <p className="text-muted-foreground">SKU master: generic/brand, form, price, reorder level.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Medicine</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Medicine' : 'Add Medicine'}</DialogTitle>
              <DialogDescription>Set MRP, cost and reorder level. Stock is managed in Inventory.</DialogDescription>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2 sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paracetamol 500mg" /></div>
              <div className="space-y-2"><Label>Generic</Label><Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div className="space-y-2"><Label>Form</Label><Select value={form.form} onValueChange={(v) => setForm({ ...form, form: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Strength</Label><Input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="500mg" /></div>
              <div className="space-y-2"><Label>Unit</Label><Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Cost (PKR)</Label><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></div>
              <div className="space-y-2"><Label>Sale / MRP (PKR)</Label><Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tax %</Label><Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}{editing ? 'Save' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search medicines..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto" /></div>
          ) : products.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2"><Package className="size-8" />No medicines yet. Add your first SKU.</div>
          ) : (
            <div className="divide-y">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {p.name}
                      {!p.active && <Badge variant="secondary">inactive</Badge>}
                      {p.totalStock === 0 && <Badge variant="destructive">out of stock</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.genericName || p.brand || '—'} · {p.form} {p.strength} · {p.unit}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Cost PKR {p.purchasePrice} · Sale PKR {p.salePrice} · Stock {p.totalStock} {p.unit}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(p)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
