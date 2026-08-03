import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { WebsiteBuilderPageClient } from './website-builder-page-client'

export const metadata = { title: 'Website Builder — ClinicAI' }

export default async function WebsiteBuilderPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin') redirect('/dashboard')

  const clinic = await db.clinic.findUnique({ where: { id: session.clinicId } })
  if (!clinic) redirect('/login')

  return (
    <WebsiteBuilderPageClient
      clinicId={clinic.id}
      clinicName={clinic.name ?? 'Clinic'}
      userName={session.name ?? 'Admin'}
    />
  )
}
