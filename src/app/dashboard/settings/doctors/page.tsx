import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { DoctorsClient } from '@/app/dashboard/clinic/doctors/doctors-client'

export const dynamic = 'force-dynamic'

export default async function SettingsDoctorsPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId }, select: { name: true } })
  const doctors = await db.doctor.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { name: 'asc' },
    include: { services: true, _count: { select: { appointments: true, slots: true } } },
  })

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic?.name} navItems={settingsNav} settingsSidebar>
      <DoctorsClient doctors={doctors} />
    </DashboardShell>
  )
}
