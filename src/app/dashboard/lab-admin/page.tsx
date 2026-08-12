import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { LabAdminDashboard } from './lab-admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function LabAdminDashboardPage() {
  const session = await getSession()
  if (!session || session.type !== 'lab_admin') redirect('/login')

  const pendingOrders = await db.labOrder.count({
    where: { clinicId: session.clinicId, status: { in: ['pending', 'in_progress'] } },
  })
  const totalTests = await db.labTest.count({ where: { clinicId: session.clinicId } })
  const todayReports = await db.labReport.count({
    where: { clinicId: session.clinicId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  })

  return (
    <LabAdminDashboard
      clinicName={session.name}
      stats={{ pendingOrders, totalTests, todayReports }}
    />
  )
}
