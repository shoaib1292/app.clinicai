import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { VerifyEmailClient } from './verify-email-client'

export const metadata = { title: 'Verify your email — ClinicAI' }

export default async function VerifyPage() {
  const session = await getSession()
  // If the user is somehow already logged in (e.g. Google), skip ahead.
  if (session) redirect('/dashboard/clinic')
  return <VerifyEmailClient />
}
