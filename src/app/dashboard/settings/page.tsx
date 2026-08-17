import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav, clinicAdminNav, platformAdminNav } from '@/components/dashboard-shell'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const params = await searchParams
  const tab = typeof params.tab === 'string' ? params.tab : undefined

  if (session.type === 'clinic_admin' && session.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.clinicId },
      select: {
        id: true, name: true, city: true, phone: true, whatsappNumber: true, address: true,
        timezone: true, currency: true,
        onlinePaymentsEnabled: true, agentEnabled: true, pharmacyEnabled: true, inventoryEnabled: true, combineFees: true,
        logoUrl: true, logoKey: true, workingHours: true,
        tagline: true, description: true, brandColor: true, headingFont: true, bodyFont: true,
        latitude: true, longitude: true,
        agentName: true, agentGender: true, agentTone: true, agentLanguages: true, agentWelcome: true, agentFallback: true,
        clinicStats: true,
      },
    })
    if (!clinic) redirect('/login')

    const doctors = await db.doctor.findMany({
      where: { clinicId: session.clinicId, active: true },
      select: { id: true, name: true, speciality: true, qualifications: true, imageKey: true, bio: true, languages: true, displayOnWebsite: true },
    })

    const brandingData = { ...clinic, doctors }

    return (
      <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} clinicLogoUrl={clinic.logoUrl} navItems={settingsNav} settingsSidebar>
        <SettingsClient clinic={clinic} userType="clinic_admin" brandingData={brandingData} initialTab={tab} />
      </DashboardShell>
    )
  }

  const isPlatform = session.type === 'platform_admin' || session.type === 'platform_staff'

  return (
    <DashboardShell userType={session.type as any} userName={session.name} navItems={isPlatform ? platformAdminNav : clinicAdminNav}>
      <SettingsClient clinic={null} userType={session.type} />
    </DashboardShell>
  )
}
