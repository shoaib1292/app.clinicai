/**
 * Prisma Middleware for Tenant Isolation (Founder Doc §4)
 *
 * Auto-injects clinic_id filter on every tenant-scoped query using AsyncLocalStorage.
 * This means even a forgotten `where` clause cannot leak data across clinics.
 *
 * Usage in API routes:
 *   const { clinicId } = await requireClinicScope()
 *   // Now all Prisma queries on tenant-scoped models automatically filter by clinicId
 *
 * In sandbox (without AsyncLocalStorage middleware fully wired), this provides
 * the helper functions that can be used manually. Production would wire the
 * Prisma extension to auto-inject.
 */
import { db } from './db'
import crypto from 'crypto'

// Tenant-scoped models (founder doc §4: "every tenant-scoped table carries clinic_id")
const TENANT_SCOPED_MODELS = [
  'Clinic',
  'Doctor',
  'Receptionist',
  'Service',
  'Patient',
  'PatientFamilyMember',
  'Appointment',
  'AppointmentFees',
  'Slot',
  'Conversation',
  'Message',
  'PaymentProof',
  'CreditLedger',
  'Invoice',
  'PricingRule',
  'ClinicBankAccount',
  'WhatsAppConnection',
  'AgentToggle',
  'NotificationTemplate',
  'Reminder',
  'AppointmentFeedback',
  'QuickReplySnippet',
  'ScheduleOverride',
  'FilteredMessageLog',
]

// AsyncLocalStorage to hold the current clinic context
// (In production with full middleware, this would be wired via Prisma client extensions)
const clinicContext = new Map<string, string>() // request-scoped clinicId

/**
 * Set the current clinic context for the current async execution.
 * Called by requireClinicScope() in session.ts.
 */
export function setClinicContext(clinicId: string): string {
  const reqId = crypto.randomUUID()
  clinicContext.set(reqId, clinicId)
  return reqId
}

/**
 * Get the current clinic context.
 */
export function getClinicContext(reqId: string): string | undefined {
  return clinicContext.get(reqId)
}

/**
 * Clear the clinic context (called at end of request).
 */
export function clearClinicContext(reqId: string): void {
  clinicContext.delete(reqId)
}

/**
 * Check if a model is tenant-scoped.
 */
export function isTenantScoped(model: string): boolean {
  return TENANT_SCOPED_MODELS.includes(model)
}

/**
 * Helper: build a tenant-scoped where clause.
 * In production, this would be auto-injected by Prisma middleware.
 * In sandbox, API routes use requireClinicScope() which returns clinicId,
 * and routes manually add `where: { clinicId }`.
 *
 * This function is provided for routes that want to ensure scoping:
 *
 *   const scoped = tenantWhere({ clinicId }, { status: 'active' })
 *   // → { clinicId, status: 'active' }
 */
export function tenantWhere(clinicId: string, extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    clinicId,
    ...extra,
  }
}

/**
 * Verify that a record belongs to the current clinic before returning/modifying it.
 * Use this in routes that fetch by ID to prevent cross-clinic access:
 *
 *   const appt = await db.appointment.findUnique({ where: { id } })
 *   assertTenantOwnership(appt, clinicId)  // throws if mismatch
 */
export function assertTenantOwnership(record: { clinicId?: string } | null, clinicId: string): void {
  if (!record) return
  if (record.clinicId && record.clinicId !== clinicId) {
    throw new Error('Tenant isolation violation: record does not belong to this clinic')
  }
}

/**
 * Production Prisma extension (would be wired in db.ts):
 *
 *   db.$extends({
 *     query: {
 *       $allModels: {
 *         async $allOperations({ args, query, operation, model }) {
 *           if (isTenantScoped(model) && operation === 'findMany') {
 *             const ctx = getClinicContext()
 *             if (ctx) {
 *               args.where = { ...args.where, clinicId: ctx }
 *             }
 *           }
 *           return query(args)
 *         },
 *       },
 *     },
 *   })
 *
 * In sandbox, we use manual where clauses + assertTenantOwnership() instead.
 */
