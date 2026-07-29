import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { PayPageClient } from './pay-client'

export const metadata = { title: 'Payment — ClinicAI' }

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const paymentToken = await db.paymentToken.findUnique({
    where: { token, deletedAt: null },
    include: {
      clinic: { select: { name: true, logoUrl: true } },
      appointment: { include: { doctor: { select: { name: true, speciality: true } }, patient: { select: { name: true } } } },
    },
  })

  if (!paymentToken) {
    redirect('/')
  }

  if (paymentToken.status === 'paid') {
    redirect(`/pay/success?token=${token}`)
  }

  if (paymentToken.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">⏰</div>
          <h1 className="text-2xl font-bold">Payment Link Expired</h1>
          <p className="text-muted-foreground">
            Yeh payment link expire ho chuka hai. Naya payment link generate karne ke liye clinic se contact karein.
          </p>
        </div>
      </div>
    )
  }

  const bankAccounts = await db.clinicBankAccount.findMany({
    where: { clinicId: paymentToken.clinicId, deletedAt: null },
  })

  const appointment = paymentToken.appointment
  const payToken = {
    ...paymentToken,
    appointment: appointment
      ? {
          appointmentId: appointment.id,
          doctor: { name: appointment.doctor.name, speciality: appointment.doctor.speciality },
          patient: { name: appointment.patient.name },
        }
      : null,
  }

  return <PayPageClient paymentToken={payToken} bankAccounts={bankAccounts} />
}
