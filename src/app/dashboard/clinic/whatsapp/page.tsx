import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { WhatsAppClient } from './whatsapp-client'

export const metadata = { title: 'WhatsApp Connection — ClinicAI' }

export default async function WhatsAppPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: {
      id: true,
      name: true,
      slug: true,
      evolutionConnected: true,
      evolutionInstance: true,
      metaConnected: true,
      metaPhoneId: true,
      metaWabaId: true,
      phone: true,
      whatsappConnections: {
        select: { id: true, mode: true, phone: true, status: true, evoInstanceName: true, metaPhoneId: true },
      },
    },
  })
  if (!clinic) redirect('/login')

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} navItems={clinicAdminNav}>
      <WhatsAppClient clinic={clinic} />
    </DashboardShell>
  )
}
