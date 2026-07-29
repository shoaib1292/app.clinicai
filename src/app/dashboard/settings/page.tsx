import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getClinicFeatures } from '@/lib/features'
import { DashboardShell, clinicAdminNav, doctorNav, receptionistNav, platformAdminNav } from '@/components/dashboard-shell'
import { SettingsClient } from './settings-client'

export const metadata = { title: 'Settings — ClinicAI' }

const NAV_MAP: Record<string, typeof clinicAdminNav> = {
  clinic_admin: clinicAdminNav,
  doctor: doctorNav,
  receptionist: receptionistNav,
  platform_admin: platformAdminNav,
  platform_staff: platformAdminNav,
}

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const navItems = NAV_MAP[session.type] || clinicAdminNav

  if (session.type === 'clinic_admin' && session.clinicId) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.clinicId },
      select: {
        id: true, name: true, city: true, phone: true, whatsappNumber: true, address: true,
        timezone: true, currency: true,
        onlinePaymentsEnabled: true, agentEnabled: true, pharmacyEnabled: true, inventoryEnabled: true,
        logoUrl: true, workingHours: true,
      },
    })
    if (!clinic) redirect('/login')

    const feat = await getClinicFeatures(session.clinicId)
    const enabledFeatures = new Set<string>()
    const subFeatures: Record<string, boolean> = {}
    if (feat.pharmacyEnabled) {
      enabledFeatures.add('pharmacy')
      for (const sub of ['inventory', 'suppliers', 'prescriptions', 'counter', 'reports']) {
        // Default on when pharmacy is enabled and no explicit row exists; an
        // explicit enabled:false row (turned off by the user) must stay off.
        const enabled = feat.features[sub]?.enabled ?? true
        subFeatures[sub] = enabled
        if (enabled) enabledFeatures.add(sub)
      }
    }

    return (
      <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinic.name} clinicLogoUrl={clinic.logoUrl} navItems={navItems} enabledFeatures={enabledFeatures}>
        <SettingsClient clinic={clinic} userType="clinic_admin" subFeatures={subFeatures} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell userType={session.type as any} userName={session.name} navItems={navItems}>
      <SettingsClient clinic={null} userType={session.type} />
    </DashboardShell>
  )
}
