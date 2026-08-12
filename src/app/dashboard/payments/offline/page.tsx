'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Search, X, Banknote, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'EasyPaisa' },
]

interface Patient {
  id: string
  name: string | null
  phone: string
}

export default function OfflinePaymentsPage() {
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [notes, setNotes] = useState('')
  const [refNumber, setRefNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)

  async function searchPatients() {
    if (!searchQuery || searchQuery.length < 2) return
    setSearching(true)
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      if (json.ok) setPatients(json.data || [])
    } catch { }
    setSearching(false)
  }

  async function recordPayment() {
    if (!selectedPatient) { toast.error('Select a patient'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payments/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          amount: Number(amount),
          paymentMode,
          notes: notes || undefined,
          referenceNumber: refNumber || undefined,
        }),
      })
      const json = await res.json()
      if (!json.ok) { toast.error(json.error || 'Failed'); setSaving(false); return }
      toast.success(`PKR ${amount} payment recorded for ${selectedPatient.name || selectedPatient.phone}`)
      setAmount('')
      setNotes('')
      setRefNumber('')
      setSelectedPatient(null)
    } catch { toast.error('Network error') }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Record Offline Payment</h1>
        <p className="text-muted-foreground">Manually record cash, bank transfer, or wallet payments received at the clinic.</p>
      </div>

      {/* Patient Search */}
      <div className="space-y-2">
        <Label>Patient</Label>
        {selectedPatient ? (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div>
              <div className="font-medium text-sm">{selectedPatient.name || 'Unnamed'}</div>
              <div className="text-xs text-muted-foreground">{selectedPatient.phone}</div>
            </div>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setSelectedPatient(null)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
            />
            <Button variant="outline" onClick={searchPatients} disabled={searching}>
              <Search className="size-4" />
            </Button>
          </div>
        )}

        {patients.length > 0 && !selectedPatient && (
          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
            {patients.map((p) => (
              <button
                key={p.id}
                className="w-full text-left p-3 hover:bg-muted transition-colors"
                onClick={() => { setSelectedPatient(p); setPatients([]); setSearchQuery('') }}
              >
                <div className="text-sm font-medium">{p.name || 'Unnamed'}</div>
                <div className="text-xs text-muted-foreground">{p.phone}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount (PKR)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
        </div>
        <div className="space-y-2">
          <Label>Payment Mode</Label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reference Number (optional)</Label>
        <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="Receipt ID or transaction ID" />
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details..." rows={2} />
      </div>

      <Button onClick={recordPayment} disabled={saving || !selectedPatient || !amount} className="w-full">
        {saving ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <Banknote className="size-4 mr-1.5" />
        )}
        Record Payment
      </Button>
    </div>
  )
}
