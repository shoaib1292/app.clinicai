import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { RemindersClient } from '@/app/dashboard/reminders/reminders-client'

export const dynamic = 'force-dynamic'

export default async function SettingsRemindersPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

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

  const templates = await db.notificationTemplate.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { triggerEvent: 'asc' },
  })

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={settingsNav} settingsSidebar>
      <RemindersClient reminders={reminders} templates={templates} />
    </DashboardShell>
  )
}
