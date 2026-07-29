import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { InventoryClient } from './inventory-client'

export const metadata = { title: 'Inventory — ClinicAI' }

export default async function InventoryPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId || session.type !== 'clinic_admin') redirect('/dashboard')
  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId }, select: { name: true } })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <InventoryClient />
    </DashboardShell>
  )
}
