import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.type !== 'clinic_admin') {
    redirect('/dashboard/clinic')
  }

  if (!session.clinicId) {
    redirect('/login')
  }

  // Enforce email verification for password-signup admins before onboarding.
  if (session.type === 'clinic_admin') {
    const admin = await db.clinicAdmin.findUnique({
      where: { id: session.sub },
      select: { emailVerified: true },
    })
    if (!admin?.emailVerified) {
      redirect(`/signup/verify?email=${encodeURIComponent(admin?.email || session.email || '')}`)
    }
  }

  // Check if onboarding already completed
  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { onboardingCompleted: true, name: true },
  })

  if (clinic?.onboardingCompleted) {
    redirect('/dashboard/clinic')
  }

  return (
    <OnboardingClient
      clinicId={session.clinicId}
      clinicName={clinic?.name || session.name}
    />
  )
}
