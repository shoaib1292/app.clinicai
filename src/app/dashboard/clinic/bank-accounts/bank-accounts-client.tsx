'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Wallet, Plus, Loader2, Landmark, Smartphone, Star } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string | null
  walletType: string | null
  walletNumber: string | null
  instructionsText: string | null
  isDefault: boolean
  createdAt: Date
}

const EMPTY_FORM = {
  bankName: '', accountTitle: '', accountNumber: '', iban: '',
  walletType: '', walletNumber: '', instructionsText: '', isDefault: false,
}

export function BankAccountsClient({ clinicId, accounts }: { clinicId: string; accounts: Account[] }) {
  const [list, setList] = useState(accounts)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  async function save() {
    if (!form.bankName || !form.accountTitle || !form.accountNumber) { toast.error('Bank name, account title and number required'); return }
    setLoading(true)
    const res = await fetch(`/api/clinics/${clinicId}/bank-accounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
    toast.success('Bank account added')
    setOpen(false)
    setForm(EMPTY_FORM)
    const fresh = await fetch(`/api/clinics/${clinicId}/bank-accounts`).then((r) => r.json())
    if (fresh.ok) setList(fresh.data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">{list.length} account{list.length !== 1 ? 's' : ''} · shown to patients paying online</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Account</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Bank Account / Wallet</DialogTitle>
              <DialogDescription>Patients paying online will see these details to transfer funds and upload a screenshot.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="HBL / Meezan / …" />
                </div>
                <div className="space-y-2">
                  <Label>Account Title</Label>
                  <Input value={form.accountTitle} onChange={(e) => setForm({ ...form, accountTitle: e.target.value })} placeholder="Al-Shifa Clinic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>IBAN (optional)</Label>
                  <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="PK36…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-2">
                  <Label>Wallet Number</Label>
                  <Input value={form.walletNumber} onChange={(e) => setForm({ ...form, walletNumber: e.target.value })} placeholder="03XX…" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Instructions (optional)</Label>
                <Textarea value={form.instructionsText} onChange={(e) => setForm({ ...form, instructionsText: e.target.value })} rows={2} placeholder="Send screenshot to clinic WhatsApp after transfer." />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="default" checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
                <Label htmlFor="default" className="cursor-pointer font-normal">Set as default (shown first to patients)</Label>
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
                    <div className="font-medium">{a.bankName}</div>
                    <div className="text-xs text-muted-foreground">{a.accountTitle}</div>
                  </div>
                </div>
                {a.isDefault && <Badge variant="default" className="text-xs"><Star className="w-3 h-3 mr-1" />Default</Badge>}
              </div>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Account #:</span> {a.accountNumber}</div>
                {a.iban && <div><span className="text-muted-foreground">IBAN:</span> <span className="font-mono text-xs">{a.iban}</span></div>}
                {a.walletType && a.walletNumber && (
                  <div><span className="text-muted-foreground capitalize">{a.walletType}:</span> {a.walletNumber}</div>
                )}
              </div>
              {a.instructionsText && <div className="text-xs text-muted-foreground italic line-clamp-2">{a.instructionsText}</div>}
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">No bank accounts yet. Add one to start accepting online payments.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
