import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { AgentClient } from './agent-client'

export const metadata = { title: 'Agent Persona — ClinicAI' }

export default async function AgentPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinicId = session.clinicId
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true,
      agentEnabled: true,
      agentName: true,
      agentGender: true,
      agentTone: true,
      agentLanguages: true,
      agentWelcome: true,
      agentFallback: true,
      onlinePaymentsEnabled: true,
    },
  })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <AgentClient clinicId={clinicId} initial={clinic} />
    </DashboardShell>
  )
}
