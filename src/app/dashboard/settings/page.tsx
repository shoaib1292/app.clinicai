import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getClinicFeatures } from '@/lib/features'
import { DashboardShell, clinicAdminNav, settingsNav } from '@/components/dashboard-shell'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.type === 'clinic_admin' && session.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.clinicId },
      select: {
        id: true, name: true, city: true, phone: true, whatsappNumber: true, address: true,
        timezone: true, currency: true,
        onlinePaymentsEnabled: true, agentEnabled: true, pharmacyEnabled: true, inventoryEnabled: true,
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

    const feat = await getClinicFeatures(session.clinicId)
    const subFeatures: Record<string, boolean> = {}
    if (feat.pharmacyEnabled) {
      for (const sub of ['inventory', 'suppliers', 'prescriptions', 'counter', 'reports']) {
        const enabled = feat.features[sub]?.enabled ?? true
        subFeatures[sub] = enabled
      }
    }

    return (
      <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} clinicLogoUrl={clinic.logoUrl} navItems={settingsNav} settingsSidebar>
        <SettingsClient clinic={clinic} userType="clinic_admin" subFeatures={subFeatures} brandingData={brandingData} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell userType={session.type as any} userName={session.name} navItems={clinicAdminNav}>
      <SettingsClient clinic={null} userType={session.type} />
    </DashboardShell>
  )
}
