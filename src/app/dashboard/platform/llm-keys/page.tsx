import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { LlmKeysClient } from './llm-keys-client'

export const metadata = { title: 'LLM Keys — ClinicAI Platform' }

export default async function LlmKeysPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  const keys = await db.lLMKey.findMany({
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { callLogs: true } } },
  })
  const masked = keys.map((k) => ({ ...k, encryptedKey: '••••' + k.encryptedKey.slice(-4) }))

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <LlmKeysClient initialKeys={masked} />
    </DashboardShell>
  )
}
