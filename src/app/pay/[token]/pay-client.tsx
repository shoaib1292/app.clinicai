'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Landmark, Smartphone, Loader2, Banknote, CheckCircle2 } from 'lucide-react'

interface Props {
  paymentToken: {
    id: string
    token: string
    amount: number
    provider: string
    status: string
    appointment: {
      appointmentId: string
      doctor: { name: string; speciality: string }
      patient: { name: string | null }
    } | null
    clinic: { name: string; logoUrl: string | null }
  }
  bankAccounts: Array<{
    id: string
    bankName: string
    accountTitle: string
    accountNumber: string
    walletType: string | null
    walletNumber: string | null
    isDefault: boolean
  }>
}

export function PayPageClient({ paymentToken, bankAccounts }: Props) {
  const [paid, setPaid] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submittingProof, setSubmittingProof] = useState(false)

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold">Thank you! Payment Submitted</h2>
            <p className="text-sm text-muted-foreground">
              Aap ka payment review ke liye bhej diya gaya hai. Clinic confirm hone par aap ko notification mil jaye ga.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-lg mx-auto space-y-4 pt-8">
        {/* Header */}
        <div className="text-center space-y-2">
          {paymentToken.clinic.logoUrl ? (
            <img src={paymentToken.clinic.logoUrl} alt={paymentToken.clinic.name} className="h-14 w-auto object-contain mx-auto" />
          ) : null}
          <h1 className="text-2xl font-bold">{paymentToken.clinic.name}</h1>
          <p className="text-muted-foreground">Appointment Payment</p>
        </div>

        {/* Amount Card */}
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Total Fee</p>
            <p className="text-4xl font-bold">PKR {paymentToken.amount.toLocaleString()}</p>
            {paymentToken.appointment && (
              <div className="text-sm text-muted-foreground">
                Dr. {paymentToken.appointment.doctor.name} · {paymentToken.appointment.doctor.speciality}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="size-4" />
                Bank Transfer
              </CardTitle>
              <CardDescription>
                Amount transfer karne ke baad screenshot clinic ko WhatsApp par bhej dein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bank details clinic admin se lein</p>
              ) : (
                bankAccounts.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {a.walletType ? <Smartphone className="w-4 h-4 text-brand" /> : <Landmark className="w-4 h-4 text-brand" />}
                      <span className="font-medium text-sm">{a.bankName}</span>
                      {a.isDefault && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.accountTitle}</p>
                    <p className="text-sm font-mono">{a.accountNumber}</p>
                    {a.walletNumber && <p className="text-xs">{a.walletType}: {a.walletNumber}</p>}
                  </div>
                ))
              )}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-medium">Amount: PKR {paymentToken.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs">Screenshot upload karein (proof)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                <Button
                  onClick={async () => {
                    setSubmittingProof(true)
                    try {
                      const fd = new FormData()
                      fd.append('token', paymentToken.token)
                      fd.append('amount', String(paymentToken.amount))
                      fd.append('payerName', paymentToken.appointment?.patient?.name || 'Patient')
                      if (proofFile) fd.append('file', proofFile)
                      const res = await fetch('/api/payments/public-proof', { method: 'POST', body: fd })
                      const json = await res.json()
                      if (!json.ok) { alert(json.error || 'Upload failed'); setSubmittingProof(false); return }
                      setPaid(true)
                    } catch {
                      alert('Network error')
                      setSubmittingProof(false)
                    }
                  }}
                  disabled={submittingProof || !proofFile}
                  className="w-full"
                >
                  {submittingProof ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Submit Proof
                </Button>
                <p className="text-xs text-muted-foreground text-center">Proof submit karne se clinic confirm kare ga.</p>
              </div>
            </CardContent>
          </Card>

        <p className="text-xs text-center text-muted-foreground">
          Powered by ClinicAI · {paymentToken.clinic.name}
        </p>
      </div>
    </div>
  )
}
