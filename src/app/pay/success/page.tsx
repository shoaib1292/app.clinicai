import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Payment Successful — ClinicAI' }

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  let clinicName = 'Clinic'
  let amount = 0

  if (token) {
    const paymentToken = await db.paymentToken.findUnique({
      where: { token },
      include: { clinic: { select: { name: true } } },
    })
    if (paymentToken) {
      clinicName = paymentToken.clinic.name
      amount = paymentToken.amount
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Successful! 🎉</h1>
          <p className="text-muted-foreground">
            Aap ka PKR {amount.toLocaleString()} ka payment {clinicName} ko successfully ho gaya hai.
          </p>
          <p className="text-sm text-muted-foreground">
            Appointment confirmation WhatsApp par bhej di jaye gi.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
