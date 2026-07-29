import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, doctorNav, receptionistNav, type NavItem } from '@/components/dashboard-shell'
import { AppointmentsClient } from './appointments-client'

export const metadata = { title: 'Appointments — ClinicAI' }

export default async function AppointmentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin' && session.type !== 'doctor' && session.type !== 'receptionist') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, doctors, appts] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.doctor.findMany({ where: { clinicId }, select: { id: true, name: true, speciality: true }, orderBy: { name: 'asc' } }),
    db.appointment.findMany({
      where: { clinicId },
      orderBy: { start: 'desc' },
      take: 200,
      include: {
        patient: true,
        doctor: { select: { id: true, name: true, speciality: true } },
        service: { select: { name: true } },
        fees: true,
        slot: { select: { tokenNo: true } },
      },
    }),
  ])
  if (!clinic) redirect('/login')

  const nav: NavItem[] = session.type === 'doctor' ? doctorNav : session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'doctor' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={nav}>
      <AppointmentsClient appointments={appts} doctors={doctors} userType={session.type} />
    </DashboardShell>
  )
}
