import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { CalendarClient } from './calendar-client'

export const metadata = { title: 'Platform Calendar — ClinicAI' }

export default async function CalendarPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') redirect('/dashboard')

  const [appts, staff, clinics] = await Promise.all([
    db.platformAppointment.findMany({
      orderBy: { start: 'asc' },
      include: {
        staff: { select: { id: true, name: true, role: true } },
        admin: { select: { id: true, name: true } },
        clinic: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.platformStaff.findMany({ where: { active: true } }),
    db.clinic.findMany({ select: { id: true, name: true } }),
  ])

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <CalendarClient initialAppts={appts} staff={staff} clinics={clinics} currentUserId={session.sub} />
    </DashboardShell>
  )
}
