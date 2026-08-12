'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Building2, Wallet, Smartphone, Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BankAccount {
  id?: string
  bankName: string
  accountTitle: string
  accountNumber: string
  iban?: string
  walletType?: string
  walletNumber?: string
}

interface Props {
  data: { bankAccounts: BankAccount[] }
  onChange: (patch: { bankAccounts: BankAccount[] }) => void
  clinicId: string
  onlinePaymentsEnabled?: boolean
}

export function OnboardingPaymentSetup({ data, onChange, clinicId, onlinePaymentsEnabled }: Props) {
  const [bankName, setBankName] = useState('')
  const [accountTitle, setAccountTitle] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [iban, setIban] = useState('')
  const [walletType, setWalletType] = useState('')
  const [walletNumber, setWalletNumber] = useState('')
  const [saving, setSaving] = useState(false)

  async function addBankAccount() {
    if (!bankName || !accountTitle || !accountNumber) {
      toast.error('Bank name, account title, and account number are required')
      return
    }
    setSaving(true)
    const res = await fetch(`/api/clinics/${clinicId}/bank-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankName, accountTitle, accountNumber,
        iban: iban || undefined,
        walletType: walletType || undefined,
        walletNumber: walletNumber || undefined,
      }),
    })
    const json = await res.json()
    if (!json.ok) { toast.error(json.error || 'Failed'); setSaving(false); return }

    const newAccount: BankAccount = { bankName, accountTitle, accountNumber, iban, walletType, walletNumber }
    onChange({ bankAccounts: [...data.bankAccounts, newAccount] })
    setBankName(''); setAccountTitle(''); setAccountNumber(''); setIban(''); setWalletNumber('')
    toast.success('Bank account added')
    setSaving(false)
  }

  function removeAccount(index: number) {
    onChange({ bankAccounts: data.bankAccounts.filter((_, i) => i !== index) })
  }

  if (!onlinePaymentsEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Bank Account</h2>
          <p className="text-muted-foreground text-sm">Set up where patients will send payments.</p>
        </div>
        <p className="text-center text-sm text-muted-foreground py-8">
          Online payments are not enabled. Enable them in the previous step to add bank accounts.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Bank & Payment Accounts</h2>
        <p className="text-muted-foreground text-sm">
          Add bank accounts or wallets where patients will send payments.
        </p>
      </div>

      {/* Existing accounts */}
      {data.bankAccounts.length > 0 && (
        <div className="space-y-2">
          {data.bankAccounts.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{a.bankName} — {a.accountTitle}</div>
                  <div className="text-xs text-muted-foreground">{a.accountNumber}</div>
                </div>
                {a.walletType && (
                  <Badge variant="outline" className="text-xs">{a.walletType}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => removeAccount(i)}>
                <X className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Bank Name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HBL / Meezan / UBL" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Title</Label>
            <Input value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} placeholder="Dr. Ahmed Clinic" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890123456" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">IBAN (optional)</Label>
            <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="PK36..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Wallet Type (optional)</Label>
            <Select value={walletType} onValueChange={setWalletType}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Wallet Number</Label>
            <Input value={walletNumber} onChange={(e) => setWalletNumber(e.target.value)} placeholder="03XXXXXXXXX" />
          </div>
        </div>
        <Button onClick={addBankAccount} disabled={saving || !bankName || !accountTitle || !accountNumber} size="sm">
          {saving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Plus className="size-3.5 mr-1" />}
          Add Account
        </Button>
      </div>
    </div>
  )
}
