'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface Clinic { id: string; name: string; creditBalance: number }
interface LedgerEntry {
  id: string
  type: string
  amount: number
  reason: string
  appointmentId: string | null
  paymentProofId: string | null
  balanceAfter: number
  createdAt: Date
}

export function LedgerClient({ clinics, initialClinicId, initialEntries }: { clinics: Clinic[]; initialClinicId: string; initialEntries: LedgerEntry[] }) {
  const [clinicId, setClinicId] = useState(initialClinicId)
  const [entries, setEntries] = useState<LedgerEntry[]>(initialEntries)
  const [loading, setLoading] = useState(false)

  async function changeClinic(id: string) {
    setClinicId(id)
    setLoading(true)
    // Use the analytics/clinic endpoint shape (returns overview with creditBalance).
    // Ledger entries are NOT in that endpoint — fetch from clinic object via /api/clinics/[id].
    // To avoid creating a new API route, we fetch the clinic, but the ledger entries themselves
    // need a different endpoint. We use the existing /api/clinics/[id] for the balance and
    // skip reloading entries for non-initial clinics (they will show the initial clinic's entries).
    // For a better UX we still want fresh entries — we'll fetch via a server component refresh.
    // As a workaround, we trigger a full page reload via location.
    setLoading(false)
    if (id !== initialClinicId) {
      // Force a server re-render by navigating via window.location
      window.location.href = `/dashboard/finance/ledger?clinic=${id}`
    }
  }

  // If URL has ?clinic=, the page will re-render server-side and pass new initialEntries
  // (handled in server component above for the initial load only).

  const clinic = clinics.find((c) => c.id === clinicId)
  const totalCredit = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
  const totalDebit = entries.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Credit Ledger</h1>
          <p className="text-muted-foreground">Append-only journal of wallet credits and debits.</p>
        </div>
        {clinics.length > 0 && (
          <Select value={clinicId} onValueChange={changeClinic} disabled={loading}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select clinic" /></SelectTrigger>
            <SelectContent>
              {clinics.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Wallet} label="Current Balance" value={`PKR ${(clinic?.creditBalance ?? 0).toLocaleString()}`} color="text-brand" />
        <StatCard icon={TrendingUp} label="Total Credits" value={`PKR ${totalCredit.toLocaleString()}`} color="text-chart-2" />
        <StatCard icon={TrendingDown} label="Total Debits" value={`PKR ${totalDebit.toLocaleString()}`} color="text-chart-4" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger Entries</CardTitle>
          <CardDescription>{entries.length} entries · newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : entries.length === 0 ? (
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
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>
                        <Badge variant={e.type === 'credit' ? 'default' : 'secondary'} className="text-xs capitalize">{e.type}</Badge>
                      </TableCell>
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
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}
