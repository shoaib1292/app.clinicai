/**
 * Server-side nav builder for clinic-scoped dashboards.
 *
 * Resolves the clinic's feature toggles and returns:
 *  - navItems: the base role nav + only the enabled pharmacy tabs
 *  - enabledFeatures: a Set of enabled feature keys (for the command palette)
 *
 * Pages simply spread these into <DashboardShell navItems={nav} enabledFeatures={features} />.
 */
import { clinicAdminNav, doctorNav, receptionistNav, type NavItem } from '@/components/dashboard-shell'
import { getClinicFeatures } from './features'

export interface ClinicNavResult {
  navItems: NavItem[]
  enabledFeatures: Set<string>
}

const PHARMACY_SUBFEATURES = ['inventory', 'suppliers', 'prescriptions', 'counter', 'reports']

export async function buildClinicNav(clinicId: string | null): Promise<ClinicNavResult> {
  if (!clinicId) {
    return { navItems: clinicAdminNav, enabledFeatures: new Set() }
  }
  const state = await getClinicFeatures(clinicId)
  const enabledFeatures = new Set<string>()
  if (state.pharmacyEnabled) {
    enabledFeatures.add('pharmacy')
    for (const sub of PHARMACY_SUBFEATURES) {
      if (state.features[sub]?.enabled ?? true) enabledFeatures.add(sub)
    }
  }
  if (state.inventoryEnabled) enabledFeatures.add('inventory')

  // The pharmacy tabs are appended by DashboardShell.filterNavByFeatures using
  // enabledFeatures; here we just return the base nav + the resolved set.
  return { navItems: clinicAdminNav, enabledFeatures }
}

export const ROLE_NAV = { clinicAdminNav, doctorNav, receptionistNav }
