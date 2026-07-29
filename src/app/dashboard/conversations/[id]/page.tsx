import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, receptionistNav } from '@/components/dashboard-shell'
import { ConversationDetailClient } from './conversation-detail-client'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Conversation — ClinicAI' }

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')

  const { id } = await params
  const convo = await db.conversation.findFirst({
    where: { id, clinicId: session.clinicId },
    include: {
      patient: { include: { familyMembers: true, appointments: { take: 5, orderBy: { start: 'desc' }, include: { doctor: true } } } },
      messages: { orderBy: { ts: 'asc' } },
    },
  })
  if (!convo) notFound()

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  const navItems = session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={navItems}>
      <ConversationDetailClient convo={convo} />
    </DashboardShell>
  )
}
