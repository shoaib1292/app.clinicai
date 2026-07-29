import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, receptionistNav, clinicAdminNav, type NavItem } from '@/components/dashboard-shell'
import { PaymentsClient } from './payments-client'

export const metadata = { title: 'Payments — ClinicAI' }

export default async function PaymentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin' && session.type !== 'receptionist') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, proofs] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.paymentProof.findMany({
      where: { clinicId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        appointment: { select: { id: true, start: true, patient: { select: { name: true, phone: true } } } },
      },
    }),
  ])
  if (!clinic) redirect('/login')

  const nav: NavItem[] = session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={nav}>
      <PaymentsClient initialProofs={proofs} userType={session.type} />
    </DashboardShell>
  )
}
