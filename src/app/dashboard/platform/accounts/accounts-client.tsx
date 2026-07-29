'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Wallet, Plus, Landmark, Smartphone, Star, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  label: string
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string | null
  walletType: string | null
  walletNumber: string | null
  instructionsText: string | null
  isDefault: boolean
}

const EMPTY_FORM = {
  label: '', bankName: '', accountTitle: '', accountNumber: '', iban: '',
  walletType: '', walletNumber: '', instructionsText: '', isDefault: false,
}

export function PlatformAccountsClient({ accounts, isAdmin }: { accounts: Account[]; isAdmin: boolean }) {
  const [list, setList] = useState(accounts)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function save() {
    if (!form.label || !form.bankName || !form.accountTitle || !form.accountNumber) {
      toast.error('Label, bank name, account title and number required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/platform/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: form.label,
        bankName: form.bankName,
        accountTitle: form.accountTitle,
        accountNumber: form.accountNumber,
        iban: form.iban || undefined,
        walletType: form.walletType || undefined,
        walletNumber: form.walletNumber || undefined,
        instructionsText: form.instructionsText || undefined,
        isDefault: form.isDefault,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Payment account added')
    setOpen(false)
    setForm(EMPTY_FORM)
    const fresh = await fetch('/api/platform/accounts').then((r) => r.json())
    if (fresh.ok) setList(fresh.data)
  }

  async function remove(id: string) {
    setLoading(true)
    const res = await fetch(`/api/platform/accounts/${id}`, { method: 'DELETE' })
    const json = await res.json()
    setLoading(false)
    setDeleteId(null)
    if (!json.ok) { toast.error(json.error || 'Failed'); return }
    toast.success('Account removed')
    setList((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment Accounts</h1>
          <p className="text-muted-foreground">{list.length} account{list.length !== 1 ? 's' : ''} · clinics top-up into these</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Account</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Platform Payment Account</DialogTitle>
                <DialogDescription>Clinics will send top-up transfers to these accounts and upload a screenshot.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="JazzCash (Platform)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank / Wallet Name</Label>
                    <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="HBL / JazzCash / …" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Account Title</Label>
                    <Input value={form.accountTitle} onChange={(e) => setForm({ ...form, accountTitle: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>IBAN (optional)</Label>
                    <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="PK36…" />
                  </div>
                  <div className="space-y-2">
                    <Label>Wallet Type (optional)</Label>
                    <Select value={form.walletType} onValueChange={(v) => setForm({ ...form, walletType: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="easypaisa">Easypaisa</SelectItem>
                        <SelectItem value="jazzcash">JazzCash</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Wallet Number</Label>
                    <Input value={form.walletNumber} onChange={(e) => setForm({ ...form, walletNumber: e.target.value })} placeholder="03XX…" />
                  </div>
                  <div className="space-y-2">
                    <Label>Set as default</Label>
                    <div className="flex items-center h-10">
                      <Switch id="default" checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instructions (optional)</Label>
                  <Textarea value={form.instructionsText} onChange={(e) => setForm({ ...form, instructionsText: e.target.value })} rows={2} placeholder="Shown to clinics on the top-up screen." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}
                  Save Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => (
          <Card key={a.id} className={a.isDefault ? 'border-brand' : ''}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-md bg-brand-soft flex items-center justify-center">
                    {a.walletType ? <Smartphone className="w-4 h-4 text-brand" /> : <Landmark className="w-4 h-4 text-brand" />}
                  </div>
                  <div>
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.bankName}</div>
                  </div>
                </div>
                {a.isDefault && <Badge variant="default" className="text-xs"><Star className="w-3 h-3 mr-1" />Default</Badge>}
              </div>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Title:</span> {a.accountTitle}</div>
                <div><span className="text-muted-foreground">Account #:</span> {a.accountNumber}</div>
                {a.iban && <div><span className="text-muted-foreground">IBAN:</span> <span className="font-mono text-xs">{a.iban}</span></div>}
                {a.walletType && a.walletNumber && (
                  <div><span className="text-muted-foreground capitalize">{a.walletType}:</span> {a.walletNumber}</div>
                )}
              </div>
              {a.instructionsText && <div className="text-xs text-muted-foreground italic line-clamp-2">{a.instructionsText}</div>}
              {isAdmin && (
                <div className="pt-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">No payment accounts yet. Add one so clinics know where to send top-ups.</CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Payment Account</DialogTitle>
            <DialogDescription>This hides the account from clinics. Existing proofs stay linked.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && remove(deleteId)} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
