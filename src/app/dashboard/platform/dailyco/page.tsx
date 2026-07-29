import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { DailycoClient } from './dailyco-client'

export const metadata = { title: 'Daily.co Keys — ClinicAI' }

export default async function DailycoPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    redirect('/dashboard')
  }

  const keys = await db.dailyApiKey.findMany({
    where: { deletedAt: null },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { rooms: true } } },
  })

  const maskedKeys = keys.map((k) => ({
    id: k.id,
    alias: k.alias,
    keyMasked: '••••' + k.encryptedKey.slice(-4),
    priority: k.priority,
    enabled: k.enabled,
    minutesUsedToday: k.minutesUsedToday,
    dailyLimit: k.dailyLimit,
    lastError: k.lastError,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    roomCount: k._count.rooms,
    createdAt: k.createdAt.toISOString(),
  }))

  return (
    <DashboardShell userType={session.type as 'platform_admin' | 'platform_staff'} userName={session.name} navItems={platformAdminNav}>
      <DailycoClient sessionType={session.type} initialKeys={maskedKeys} />
    </DashboardShell>
  )
}
