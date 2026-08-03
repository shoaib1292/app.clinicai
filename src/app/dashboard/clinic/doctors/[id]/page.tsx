import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { DoctorDetailClient } from './doctor-detail-client'

export const metadata = { title: 'Doctor — ClinicAI' }

export default async function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const { id } = await params
  const doctor = await db.doctor.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      schedules: { orderBy: { dayOfWeek: 'asc' } },
      scheduleOverrides: { take: 10, orderBy: { date: 'desc' } },
      services: true,
      _count: { select: { appointments: true } },
    },
  })
  if (!doctor) notFound()

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <DoctorDetailClient doctor={doctor as any} />
    </DashboardShell>
  )
}
