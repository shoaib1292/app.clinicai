import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { FeedbackClient } from './feedback-client'

export const metadata = { title: 'Patient Feedback — ClinicAI' }

export default async function FeedbackPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true },
  })
  if (!clinic) redirect('/login')

  const doctors = await db.doctor.findMany({
    where: { clinicId: session.clinicId },
    select: { id: true, name: true, speciality: true },
    orderBy: { name: 'asc' },
  })

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <FeedbackClient doctors={doctors} />
    </DashboardShell>
  )
}
