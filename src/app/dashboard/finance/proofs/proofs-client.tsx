'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle2, XCircle, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Proof {
  id: string
  clinicId: string
  appointmentId: string | null
  ledgerType: string
  amount: number
  payerName: string
  payerPhone: string | null
  screenshotUrl: string
  uploadedBy: string
  status: string
  confirmedBy: string | null
  confirmedAt: Date | null
  notes: string | null
  createdAt: Date
  clinic?: { id: string; name: string } | null
  appointment?: { id: string; start: Date; patient: { name: string | null; phone: string } } | null
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  confirmed: 'default',
  rejected: 'destructive',
}

export function ProofsClient({ initialProofs, scope }: { initialProofs: Proof[]; scope: 'platform' | 'clinic' }) {
  const [proofs, setProofs] = useState(initialProofs)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const pending = proofs.filter((p) => p.status === 'pending')
  const recent = proofs.filter((p) => p.status !== 'pending')

  async function confirm(proofId: string) {
    setBusyId(proofId)
    const res = await fetch(`/api/payments/${proofId}/confirm`, { method: 'POST' })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Failed to confirm'); return }
    setProofs((prev) => prev.map((p) => p.id === proofId ? { ...p, status: 'confirmed', confirmedAt: new Date() } : p))
    toast.success('Payment proof confirmed')
  }

  async function reject(proofId: string) {
    setBusyId(proofId)
    const res = await fetch(`/api/payments/${proofId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason || 'Rejected by reviewer' }),
    })
    const json = await res.json()
    setBusyId(null)
    if (!json.ok) { toast.error(json.error || 'Failed to reject'); return }
    setProofs((prev) => prev.map((p) => p.id === proofId ? { ...p, status: 'rejected', notes: rejectReason } : p))
    setRejectId(null)
    setRejectReason('')
    toast.success('Payment proof rejected')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Proofs</h1>
        <p className="text-muted-foreground">
          {scope === 'platform' ? 'Across all clinics' : 'Clinic-scoped'} · {pending.length} pending, {recent.length} reviewed
        </p>
      </div>

      {pending.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-chart-2" />
            <div className="font-medium">All caught up</div>
            <div className="text-sm">No payment proofs pending review.</div>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-4 h-4 text-brand" />Pending Review</CardTitle>
            <CardDescription>Confirm to credit wallets / mark appointments paid. Reject with a reason.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Screenshot</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    {scope === 'platform' && <TableHead>Clinic</TableHead>}
                    <TableHead>Linked Appointment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.payerName}</div>
                        <div className="text-xs text-muted-foreground">{p.payerPhone || '—'} · by {p.uploadedBy}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.ledgerType === 'clinic_topup' ? 'default' : 'secondary'} className="text-xs capitalize">
                          {p.ledgerType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      {scope === 'platform' && <TableCell className="text-sm">{p.clinic?.name || '—'}</TableCell>}
                      <TableCell className="text-xs text-muted-foreground">
                        {p.appointment ? (
                          <div>
                            <div>{p.appointment.patient.name || p.appointment.patient.phone}</div>
                            <div>{new Date(p.appointment.start).toLocaleDateString('en-PK')}</div>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">PKR {p.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" className="h-7" onClick={() => confirm(p.id)} disabled={busyId === p.id}>
                            {busyId === p.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-destructive hover:text-destructive" onClick={() => setRejectId(p.id)}>
                            <XCircle className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Reviewed</CardTitle>
            <CardDescription>Last 200 reviewed proofs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payer</TableHead>
                    <TableHead>Type</TableHead>
                    {scope === 'platform' && <TableHead>Clinic</TableHead>}
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.payerName}</div>
                        <div className="text-xs text-muted-foreground">{p.payerPhone || '—'}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{p.ledgerType.replace('_', ' ')}</Badge></TableCell>
                      {scope === 'platform' && <TableCell className="text-sm">{p.clinic?.name || '—'}</TableCell>}
                      <TableCell className="text-right">PKR {p.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={STATUS_VARIANT[p.status]} className="text-xs capitalize">{p.status}</Badge>
                        {p.notes && <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate" title={p.notes}>{p.notes}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.confirmedAt ? new Date(p.confirmedAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(o) => { if (!o) { setRejectId(null); setRejectReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Proof</DialogTitle>
            <DialogDescription>Provide a short reason. This will be visible to the clinic staff.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Screenshot blurry, amount mismatch, wrong reference" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason('') }}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectId && reject(rejectId)} disabled={busyId === rejectId}>
              {busyId === rejectId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
