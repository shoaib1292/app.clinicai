import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export const metadata = { title: 'Dashboard — ClinicAI' }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Role-based redirect to the appropriate dashboard
  switch (session.type) {
    case 'platform_admin':
    case 'platform_staff':
      redirect('/dashboard/platform')
    case 'clinic_admin':
      redirect('/dashboard/clinic')
    case 'doctor':
      redirect('/dashboard/doctor')
    case 'receptionist':
      redirect('/dashboard/receptionist')
    default:
      redirect('/login')
  }
}
