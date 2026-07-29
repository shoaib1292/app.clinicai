/**
 * Feature-toggle resolution for the dashboard.
 *
 * A clinic's visible modules are driven by:
 *  - Boolean columns on Clinic (agentEnabled, onlinePaymentsEnabled,
 *    pharmacyEnabled, inventoryEnabled)
 *  - The generic ClinicFeature table (key -> { enabled, config })
 *
 * This module centralises the "what is this clinic allowed to see" decision so
 * the dashboard shell, command palette, and individual pages all agree.
 */
import { db } from './db'

export type FeatureKey =
  | 'appointments'
  | 'pharmacy'
  | 'inventory'
  | 'campaigns'
  | 'automation'
  | 'reminders'
  | 'agent'
  | 'online_payments'

export interface ClinicFeatureState {
  agentEnabled: boolean
  onlinePaymentsEnabled: boolean
  pharmacyEnabled: boolean
  inventoryEnabled: boolean
  // aggregate feature map (ClinicFeature rows + booleans)
  features: Record<string, { enabled: boolean; config: Record<string, unknown> }>
}

/**
 * Load the full feature state for a clinic.
 * `pharmacy` is considered enabled if EITHER Clinic.pharmacyEnabled is true OR
 * the ClinicFeature row with key='pharmacy' is enabled. `inventory` is gated by
 * Clinic.inventoryEnabled (a sub-feature of pharmacy).
 */
export async function getClinicFeatures(clinicId: string): Promise<ClinicFeatureState> {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { agentEnabled: true, onlinePaymentsEnabled: true, pharmacyEnabled: true, inventoryEnabled: true },
  })
  if (!clinic) {
    return {
      agentEnabled: false,
      onlinePaymentsEnabled: false,
      pharmacyEnabled: false,
      inventoryEnabled: false,
      features: {},
    }
  }

  const featureRows = await db.clinicFeature.findMany({ where: { clinicId, deletedAt: null } })
  const features: ClinicFeatureState['features'] = {}
  for (const f of featureRows) {
    let config: Record<string, unknown> = {}
    try {
      config = JSON.parse(f.config || '{}')
    } catch {
      config = {}
    }
    features[f.key] = { enabled: f.enabled, config }
  }

  // Ensure the headline booleans are reflected in the features map.
  features['agent'] = { enabled: clinic.agentEnabled, config: features['agent']?.config ?? {} }
  features['online_payments'] = { enabled: clinic.onlinePaymentsEnabled, config: features['online_payments']?.config ?? {} }
  features['pharmacy'] = { enabled: clinic.pharmacyEnabled || features['pharmacy']?.enabled || false, config: features['pharmacy']?.config ?? {} }
  features['inventory'] = { enabled: clinic.inventoryEnabled, config: features['inventory']?.config ?? {} }

  return {
    agentEnabled: clinic.agentEnabled,
    onlinePaymentsEnabled: clinic.onlinePaymentsEnabled,
    pharmacyEnabled: features['pharmacy'].enabled,
    inventoryEnabled: clinic.inventoryEnabled,
    features,
  }
}

/** True if a feature key is enabled for the clinic. */
export function isFeatureEnabled(state: ClinicFeatureState, key: FeatureKey): boolean {
  return state.features[key]?.enabled ?? false
}
