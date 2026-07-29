import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { SignupClient } from './signup-client'

export const metadata = { title: 'Register — ClinicAI' }

export default async function SignupPage() {
  const session = await getSession()
  if (session) {
    const dest =
      session.type === 'platform_admin' || session.type === 'platform_staff'
        ? '/dashboard/platform'
        : session.type === 'clinic_admin'
        ? '/dashboard/clinic'
        : session.type === 'doctor'
        ? '/dashboard/doctor'
        : session.type === 'receptionist'
        ? '/dashboard/receptionist'
        : '/'
    redirect(dest)
  }
  return <SignupClient />
}
