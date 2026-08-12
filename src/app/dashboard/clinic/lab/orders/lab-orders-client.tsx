'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, ClipboardList, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Test { id: string; name: string; price: number; category: string }
interface OrderItem { id: string; test: Test; status: string; result: string | null }
interface Order { id: string; patient: { id: string; name: string | null }; doctor: { id: string; name: string } | null; items: OrderItem[]; status: string; totalPrice: number; createdAt: string }

export function LabOrdersClient({ clinicId }: { clinicId: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<Test[]>([])
  const [patientId, setPatientId] = useState('')
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { fetchOrders(); fetchTests() }, [])

  async function fetchOrders() {
    setLoading(true)
    const res = await fetch(`/api/lab/orders?limit=100`)
    const json = await res.json()
    if (json.ok) setOrders(json.data)
    setLoading(false)
  }

  async function fetchTests() {
    const res = await fetch(`/api/lab/tests`)
    const json = await res.json()
    if (json.ok) setTests(json.data.filter((t: Test) => t.price > 0))
  }

  async function createOrder() {
    if (!patientId || selectedTests.length === 0) { toast.error('Patient and tests required'); return }
    setCreating(true)
    const res = await fetch('/api/lab/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, testIds: selectedTests }),
    })
    const json = await res.json()
    setCreating(false)
    if (!json.ok) { toast.error(json.error); return }
    toast.success('Order created')
    setOrders([json.data, ...orders])
    setShowNew(false); setPatientId(''); setSelectedTests([])
  }

  const statusColors: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" /> Lab Orders</h1>
          <p className="text-muted-foreground">Order lab tests for patients</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Order</Button>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Lab Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Patient ID" value={patientId} onChange={e => setPatientId(e.target.value)} />
            <p className="text-xs text-muted-foreground">Select tests:</p>
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
              {tests.map(t => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                  <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={e => {
                    setSelectedTests(e.target.checked ? [...selectedTests, t.id] : selectedTests.filter(id => id !== t.id))
                  }} />
                  <span>{t.name}</span>
                  <span className="text-muted-foreground ml-auto">PKR {t.price}</span>
                </label>
              ))}
            </div>
            <Button onClick={createOrder} disabled={creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(-6)}</TableCell>
                  <TableCell className="font-medium">{o.patient?.name || 'N/A'}</TableCell>
                  <TableCell>{o.items.map(i => i.test.name).join(', ')}</TableCell>
                  <TableCell>PKR {o.totalPrice}</TableCell>
                  <TableCell><Badge className={statusColors[o.status] || ''}>{o.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!loading && orders.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No orders yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
