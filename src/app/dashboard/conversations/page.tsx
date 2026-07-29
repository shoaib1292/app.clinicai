import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, receptionistNav, doctorNav } from '@/components/dashboard-shell'
import { ConversationsClient } from './conversations-client'

export const metadata = { title: 'Conversations — ClinicAI' }

export default async function ConversationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  const conversations = await db.conversation.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { patient: true, _count: { select: { messages: true } } },
  })

  const navItems = session.type === 'receptionist' ? receptionistNav : session.type === 'doctor' ? doctorNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'doctor' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={navItems}>
      <ConversationsClient initialConvos={conversations} />
    </DashboardShell>
  )
}
