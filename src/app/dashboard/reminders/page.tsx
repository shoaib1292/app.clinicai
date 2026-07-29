import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, receptionistNav } from '@/components/dashboard-shell'
import { RemindersClient } from './reminders-client'

export const metadata = { title: 'Reminders — ClinicAI' }

export default async function RemindersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  // Get upcoming reminders for this clinic's appointments
  const reminders = await db.reminder.findMany({
    where: {
      appointment: { clinicId: session.clinicId },
      sendAt: { gte: new Date() },
    },
    orderBy: { sendAt: 'asc' },
    take: 50,
    include: {
      appointment: {
        include: {
          patient: true,
          doctor: true,
        },
      },
    },
  })

  // Also get notification templates
  const templates = await db.notificationTemplate.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { triggerEvent: 'asc' },
  })

  const navItems = session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={navItems}>
      <RemindersClient reminders={reminders} templates={templates} />
    </DashboardShell>
  )
}
