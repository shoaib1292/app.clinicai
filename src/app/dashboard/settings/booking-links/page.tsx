import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { BookingLinksClient } from '@/app/dashboard/clinic/booking-links/booking-links-client'

export const dynamic = 'force-dynamic'

export default async function SettingsBookingLinksPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const [clinic, doctors, services] = await Promise.all([
    db.clinic.findUnique({ where: { id: session.clinicId } }),
    db.doctor.findMany({ where: { clinicId: session.clinicId, active: true }, orderBy: { name: 'asc' } }),
    db.service.findMany({
      where: { clinicId: session.clinicId, active: true },
      select: { id: true, name: true, baseFee: true, durationMin: true, doctor: { select: { name: true } } },
    }),
  ])
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={settingsNav} settingsSidebar>
      <BookingLinksClient clinic={clinic} doctors={doctors} services={services} />
    </DashboardShell>
  )
}
