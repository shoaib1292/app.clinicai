'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, TrendingUp, TrendingDown, Plus, Loader2, Landmark, Smartphone, Receipt } from 'lucide-react'
import { toast } from 'sonner'

interface Clinic { id: string; name: string; creditBalance: number; settlementMode: string }
interface LedgerEntry {
  id: string; type: string; amount: number; reason: string;
  appointmentId: string | null; paymentProofId: string | null;
  balanceAfter: number; createdAt: Date
}
interface Invoice {
  id: string; periodStart: Date; periodEnd: Date; totalAppointments: number;
  platformFeeTotal: number; extraClinicFeeTotal: number; metaCostTotal: number; status: string
}
interface BankAccount {
  id: string; bankName: string; accountTitle: string; accountNumber: string;
  walletType: string | null; walletNumber: string | null; isDefault: boolean
}

const INVOICE_STATUS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary', sent: 'default', paid: 'default', overdue: 'destructive',
}

export function BillingClient({ clinic, ledger, invoices, bankAccounts }: {
  clinic: Clinic; ledger: LedgerEntry[]; invoices: Invoice[]; bankAccounts: BankAccount[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', bankAccountId: '', payerName: clinic.name, notes: '' })
  const [loading, setLoading] = useState(false)

  const totalCredit = ledger.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
  const totalDebit = ledger.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0)

  async function submitTopup() {
    const amount = Number(form.amount)
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.payerName) { toast.error('Payer name required'); return }
    setLoading(true)
    const res = await fetch('/api/payments/proof', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clinicId: clinic.id,
        ledgerType: 'clinic_topup',
        amount,
        payerName: form.payerName,
        screenshotUrl: `/uploads/topup-${Date.now()}.png`,
        uploadedBy: 'admin',
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) { toast.error(json.error || 'Failed to submit'); return }
    toast.success('Top-up proof submitted. Awaiting finance confirmation.')
    setOpen(false)
    setForm({ amount: '', bankAccountId: '', payerName: clinic.name, notes: '' })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Billing & Wallet</h1>
          <p className="text-muted-foreground">Pre-paid credit balance · settlement mode: <span className="capitalize">{clinic.settlementMode}</span></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Top-up Wallet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Top-up Wallet</DialogTitle>
              <DialogDescription>Submit a transfer screenshot. Finance will confirm and your credit balance will update.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Amount (PKR)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" />
              </div>
              <div className="space-y-2">
                <Label>Payer Name</Label>
                <Input value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Send to</Label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a bank account (for reference)" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.bankName} — {a.accountNumber} {a.isDefault ? '(default)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bankAccounts.length > 0 && (
                  <div className="rounded-md border p-3 bg-muted/30 text-xs space-y-1.5">
                    {bankAccounts.map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        {a.walletType ? <Smartphone className="w-3 h-3 mt-0.5 text-brand" /> : <Landmark className="w-3 h-3 mt-0.5 text-brand" />}
                        <div>
                          <div className="font-medium">{a.bankName} {a.isDefault && <Badge variant="outline" className="text-xs ml-1">default</Badge>}</div>
                          <div className="text-muted-foreground">{a.accountTitle} · {a.accountNumber}{a.iban ? ` · ${a.iban}` : ''}</div>
                          {a.walletType && a.walletNumber && <div className="text-muted-foreground capitalize">{a.walletType}: {a.walletNumber}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">A placeholder screenshot path will be attached. In production, an upload widget would replace it.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submitTopup} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                Submit Top-up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <Wallet className="w-5 h-5 text-brand" />
            <div className="mt-2 text-2xl font-bold">PKR {clinic.creditBalance.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Current Balance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-chart-2" />
            <div className="mt-2 text-2xl font-bold">PKR {totalCredit.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Top-ups</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingDown className="w-5 h-5 text-chart-4" />
            <div className="mt-2 text-2xl font-bold">PKR {totalDebit.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Debited (platform fees)</div>
          </CardContent>
        </Card>
      </div>

      {/* Credit ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit Ledger</CardTitle>
          <CardDescription>{ledger.length} entries · append-only</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No ledger entries yet.</div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell><Badge variant={e.type === 'credit' ? 'default' : 'secondary'} className="text-xs capitalize">{e.type}</Badge></TableCell>
                      <TableCell className="text-sm capitalize">{e.reason.replace('_', ' ')}</TableCell>
                      <TableCell className={`text-right font-medium ${e.type === 'credit' ? 'text-chart-2' : 'text-chart-4'}`}>
                        {e.type === 'credit' ? '+' : '-'}PKR {e.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">PKR {e.balanceAfter.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" />Invoices</CardTitle>
          <CardDescription>{invoices.length} billing periods</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No invoices yet.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto scroll-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Appts</TableHead>
                    <TableHead className="text-right">Platform Fee</TableHead>
                    <TableHead className="text-right">Extra</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs">
                        {new Date(i.periodStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} — {new Date(i.periodEnd).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">{i.totalAppointments}</TableCell>
                      <TableCell className="text-right">PKR {i.platformFeeTotal.toLocaleString()}</TableCell>
                      <TableCell className="text-right">PKR {i.extraClinicFeeTotal.toLocaleString()}</TableCell>
                      <TableCell className="text-center"><Badge variant={INVOICE_STATUS[i.status] || 'secondary'} className="text-xs capitalize">{i.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
