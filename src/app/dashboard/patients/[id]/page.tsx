import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { DashboardShell, clinicAdminNav, receptionistNav, doctorNav } from '@/components/dashboard-shell'
import { PatientDetailClient } from './patient-detail-client'

export const metadata = { title: 'Patient — ClinicAI' }

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')

  const { id } = await params
  const patient = await db.patient.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      familyMembers: true,
      appointments: {
        take: 20,
        orderBy: { start: 'desc' },
        include: { doctor: true, service: true, fees: true },
      },
      conversations: {
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, status: true, lastIntent: true, updatedAt: true, _count: { select: { messages: true } } },
      },
    },
  })
  if (!patient) notFound()

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  const navItems = session.type === 'receptionist' ? receptionistNav : session.type === 'doctor' ? doctorNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'doctor' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={navItems}>
      <PatientDetailClient patient={patient} />
    </DashboardShell>
  )
}
