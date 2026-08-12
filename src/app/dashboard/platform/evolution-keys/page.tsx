import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { EvolutionKeysClient } from './evolution-keys-client'

export const metadata = { title: 'Evolution API Keys — ClinicAI Platform' }

export default async function EvolutionKeysPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  const keys = await db.evolutionApiKey.findMany({
    orderBy: { createdAt: 'desc' },
  })
  const masked = keys.map((k) => ({ ...k, encryptedKey: '••••' + k.encryptedKey.slice(-4) }))

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <EvolutionKeysClient initialKeys={masked} />
    </DashboardShell>
  )
}
