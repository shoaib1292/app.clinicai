import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { TemplatesClient } from './templates-client'

export const metadata = { title: 'Message Templates — ClinicAI' }

export default async function TemplatesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true },
  })
  if (!clinic) redirect('/login')

  return <TemplatesClient session={session} clinicName={clinic.name} />
}
