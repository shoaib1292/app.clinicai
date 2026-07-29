import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, doctorNav, receptionistNav, type NavItem } from '@/components/dashboard-shell'
import { PatientsClient } from './patients-client'

export const metadata = { title: 'Patients — ClinicAI' }

export default async function PatientsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin' && session.type !== 'doctor' && session.type !== 'receptionist') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, patients] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.patient.findMany({
      where: { clinicId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { appointments: true, familyMembers: true, conversations: true } },
      },
    }),
  ])
  if (!clinic) redirect('/login')

  const nav: NavItem[] = session.type === 'doctor' ? doctorNav : session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'doctor' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={nav}>
      <PatientsClient patients={patients} />
    </DashboardShell>
  )
}
