import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, receptionistNav } from '@/components/dashboard-shell'
import { AgentChatClient } from './agent-chat-client'

export const metadata = { title: 'Agent Chat Test — ClinicAI' }

export default async function AgentChatPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  const navItems = session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={navItems}>
      <AgentChatClient clinic={clinic} />
    </DashboardShell>
  )
}
