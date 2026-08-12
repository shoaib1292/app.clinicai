import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { PharmacistDashboard } from './pharmacist-dashboard'

export const dynamic = 'force-dynamic'

export default async function PharmacistDashboardPage() {
  const session = await getSession()
  if (!session || session.type !== 'pharmacist') redirect('/login')

  const pharmacyProducts = await db.pharmacyProduct.count({ where: { clinicId: session.clinicId } })
  const pendingPrescriptions = await db.prescription.count({ where: { clinicId: session.clinicId } })
  const todaySales = await db.pharmacySale.count({
    where: { clinicId: session.clinicId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  })

  return (
    <PharmacistDashboard
      clinicName={session.name}
      stats={{ products: pharmacyProducts, prescriptions: pendingPrescriptions, todaySales }}
    />
  )
}
