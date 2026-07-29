import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { AssemblyAiClient } from './assembly-ai-client'

export const metadata = { title: 'Assembly AI — ClinicAI' }

export default async function AssemblyAiPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    redirect('/dashboard')
  }

  const keys = await db.lLMKey.findMany({
    where: { provider: 'assemblyai' },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { callLogs: true } } },
  })

  const maskedKeys = keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    alias: k.alias,
    keyMasked: '••••' + k.encryptedKey.slice(-4),
    priority: k.priority,
    dailyBudgetUsd: k.dailyBudgetUsd,
    enabled: k.enabled,
    model: k.model,
    ttsModel: k.ttsModel,
    sttModel: k.sttModel,
    lastError: k.lastError,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    callCount: k._count.callLogs,
    createdAt: k.createdAt.toISOString(),
  }))

  return (
    <DashboardShell userType={session.type as 'platform_admin' | 'platform_staff'} userName={session.name} navItems={platformAdminNav}>
      <AssemblyAiClient sessionType={session.type} initialKeys={maskedKeys} />
    </DashboardShell>
  )
}
