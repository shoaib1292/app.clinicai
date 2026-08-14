import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { ServicesClient } from '@/app/dashboard/clinic/services/services-client'

export const dynamic = 'force-dynamic'

export default async function SettingsServicesPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const [clinic, services, doctors] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.service.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      include: { doctor: { select: { id: true, name: true } }, _count: { select: { appointments: true } } },
    }),
    db.doctor.findMany({ where: { clinicId, active: true }, select: { id: true, name: true, speciality: true }, orderBy: { name: 'asc' } }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={settingsNav} settingsSidebar>
      <ServicesClient services={JSON.parse(JSON.stringify(services))} doctors={JSON.parse(JSON.stringify(doctors))} />
    </DashboardShell>
  )
}
