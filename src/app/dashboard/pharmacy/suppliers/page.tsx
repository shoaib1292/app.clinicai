import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { SuppliersClient } from './suppliers-client'

export const metadata = { title: 'Suppliers & Purchases — ClinicAI' }

export default async function SuppliersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId || session.type !== 'clinic_admin') redirect('/dashboard')
  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId }, select: { name: true } })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <SuppliersClient />
    </DashboardShell>
  )
}
