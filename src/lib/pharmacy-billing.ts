/**
 * Pharmacy billing ("hisab kitab") — flexible per-clinic config + platform fee.
 *
 * Unlike appointments (fixed doctorFee + platformFee PKR 50), pharmacy sales use
 * a transparent line-item model plus a configurable platform fee that is charged
 * IN ADDITION TO the appointment fee. The founder's default: 1% of sale total
 * (per_sale model).
 *
 * The per-clinic billing config lives on the `pharmacy` ClinicFeature.config JSON,
 * falling back to the platform PricingRule pharmacy fee fields. This lets one
 * codebase serve consult-only, pharmacy-only and combined clinics.
 */
import { db } from './db'

// ── Config shapes ────────────────────────────────────────────────────────────

export type PharmacyFeeModel = 'none' | 'per_consult' | 'per_sale' | 'on_margin'

export interface PharmacyBillingConfig {
  consultationFeeApplies: boolean // false for dispensary-only ("dawai hi dete hain")
  bundleWithAppointment: boolean // one receipt for consult + medicines
  platformFeeModel: PharmacyFeeModel // none | per_consult | per_sale | on_margin
  platformFeeFixed: number // PKR flat if per_sale / per_consult
  platformFeePct: number // % of sale total (per_sale) or margin (on_margin)
  platformFeeDefaultPct: number // platform-wide default used when no per-clinic override
  taxInclusive: boolean // GST handling
  allowDiscount: boolean
  allowOnlinePayment: boolean
}

export const DEFAULT_PHARMACY_CONFIG: PharmacyBillingConfig = {
  consultationFeeApplies: true,
  bundleWithAppointment: true,
  platformFeeModel: 'per_sale',
  platformFeeFixed: 0,
  platformFeePct: 1, // founder default: 1% per sale
  platformFeeDefaultPct: 1,
  taxInclusive: false,
  allowDiscount: true,
  allowOnlinePayment: true,
}

// ── Feature resolution ────────────────────────────────────────────────────────

export interface ResolvedPharmacyFeatures {
  pharmacyEnabled: boolean
  inventoryEnabled: boolean
  config: PharmacyBillingConfig
}

function parseConfig(json: string | null | undefined, defaults: PharmacyBillingConfig): PharmacyBillingConfig {
  if (!json) return { ...defaults }
  try {
    const parsed = JSON.parse(json)
    return { ...defaults, ...parsed }
  } catch {
    return { ...defaults }
  }
}

/**
 * Resolve the effective pharmacy features for a clinic by merging:
 *  - Clinic.pharmacyEnabled / inventoryEnabled booleans
 *  - The 'pharmacy' ClinicFeature row (enabled flag + config JSON)
 *  - Platform PricingRule pharmacy fee fields (the platform-set % charge)
 */
export async function getPharmacyFeatures(
  clinicId: string,
  opts?: { clinic?: { pharmacyEnabled?: boolean; inventoryEnabled?: boolean } },
): Promise<ResolvedPharmacyFeatures> {
  const clinic = opts?.clinic
    ? { pharmacyEnabled: opts.clinic.pharmacyEnabled ?? false, inventoryEnabled: opts.clinic.inventoryEnabled ?? false }
    : await db.clinic
        .findUnique({ where: { id: clinicId }, select: { pharmacyEnabled: true, inventoryEnabled: true } })
        .then((c) => c ?? { pharmacyEnabled: false, inventoryEnabled: false })

  const feature = await db.clinicFeature.findUnique({ where: { clinicId_key: { clinicId, key: 'pharmacy' } } })

  // Platform-wide default pharmacy fee % from the global PricingRule.
  const globalRule = await db.pricingRule.findFirst({ where: { scope: 'global' } })
  const platformPct = globalRule?.pharmacyFeePct ?? DEFAULT_PHARMACY_CONFIG.platformFeeDefaultPct
  const platformModel = (globalRule?.pharmacyFeeModel as PharmacyFeeModel) ?? DEFAULT_PHARMACY_CONFIG.platformFeeModel

  const config = parseConfig(feature?.config, {
    ...DEFAULT_PHARMACY_CONFIG,
    platformFeeDefaultPct: platformPct,
    // If the platform has explicitly set a model, prefer it as the default baseline.
    platformFeeModel: platformModel,
    platformFeePct: platformPct,
  })

  // Master switch: Clinic.pharmacyEnabled OR the ClinicFeature enabled flag.
  const pharmacyEnabled = Boolean(clinic.pharmacyEnabled || feature?.enabled)
  const inventoryEnabled = Boolean(clinic.inventoryEnabled)

  return { pharmacyEnabled, inventoryEnabled, config }
}

// ── Platform fee math ─────────────────────────────────────────────────────────

/**
 * Compute the platform fee on a pharmacy sale.
 * @param saleTotal  net medicines total (subtotal − discount)
 * @param margin     (costPrice) for on_margin model; pass saleTotal − costTotal
 * @param config     resolved billing config
 */
export function computePharmacyPlatformFee(
  saleTotal: number,
  margin: number,
  config: PharmacyBillingConfig,
): number {
  const model = config.platformFeeModel
  if (model === 'none') return 0
  if (model === 'per_sale') {
    const pct = config.platformFeePct || config.platformFeeDefaultPct || 0
    return Math.round((saleTotal * pct) / 100) + (config.platformFeeFixed || 0)
  }
  if (model === 'on_margin') {
    const pct = config.platformFeePct || config.platformFeeDefaultPct || 0
    return Math.round((Math.max(0, margin) * pct) / 100)
  }
  if (model === 'per_consult') {
    return config.platformFeeFixed || 0
  }
  return 0
}

// ── Sale recording (ledger + platform fee debit) ──────────────────────────────

export interface PharmacySaleLine {
  productId: string
  batchId?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface RecordPharmacySaleInput {
  clinicId: string
  patientId?: string | null
  prescriptionId?: string | null
  appointmentId?: string | null
  channel?: string // counter | whatsapp | link
  paymentMode?: string // cash | online
  paymentStatus?: string
  createdByStaffId?: string | null
  lines: PharmacySaleLine[]
  discount?: number
  tax?: number
  costTotal?: number // total cost price of dispensed stock (for on_margin fee)
}

export interface RecordPharmacySaleResult {
  saleId: string
  subtotal: number
  discount: number
  tax: number
  total: number
  platformFee: number
  creditBalanceAfter: number
}

/**
 * Record a pharmacy sale, decrement stock (FIFO handled by caller or here),
 * and post the platform fee to the CreditLedger + clinic.creditBalance, exactly
 * like appointment_fee. Returns the persisted sale + computed platform fee.
 */
export async function recordPharmacySale(input: RecordPharmacySaleInput): Promise<RecordPharmacySaleResult> {
  const { clinicId } = input
  const config = (await getPharmacyFeatures(clinicId)).config

  const subtotal = input.lines.reduce((s, l) => s + l.lineTotal, 0)
  const discount = input.discount ?? 0
  const tax = input.tax ?? 0
  const total = Math.max(0, subtotal - discount + tax)

  const sale = await db.pharmacySale.create({
    data: {
      clinicId,
      patientId: input.patientId ?? null,
      prescriptionId: input.prescriptionId ?? null,
      appointmentId: input.appointmentId ?? null,
      subtotal,
      discount,
      tax,
      total,
      paymentMode: input.paymentMode ?? 'cash',
      paymentStatus: input.paymentStatus ?? 'pending',
      channel: input.channel ?? 'counter',
      createdByStaffId: input.createdByStaffId ?? null,
      items: {
        create: input.lines.map((l) => ({
          productId: l.productId,
          batchId: l.batchId ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      },
    },
  })

  // Decrement stock per line. If batchId is provided we debit that exact lot;
  // otherwise we allocate FIFO across the product's available batches (oldest
  // expiry first), which is the Pakistani-pharmacy-correct dispensing order.
  for (const line of input.lines) {
    if (line.batchId) {
      const batch = await db.pharmacyStockBatch.findUnique({ where: { id: line.batchId } })
      if (batch) {
        await db.pharmacyStockBatch.update({
          where: { id: line.batchId },
          data: { quantity: Math.max(0, batch.quantity - line.quantity) },
        })
      }
    } else {
      let remaining = line.quantity
      const batches = await db.pharmacyStockBatch.findMany({
        where: { clinicId, productId: line.productId, quantity: { gt: 0 } },
        orderBy: [{ expiry: 'asc' }, { receivedAt: 'asc' }],
      })
      for (const batch of batches) {
        if (remaining <= 0) break
        const take = Math.min(remaining, batch.quantity)
        await db.pharmacyStockBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - take },
        })
        remaining -= take
      }
      if (remaining > 0) {
        // Not enough stock across batches — log but still record the sale.
        console.warn(`Pharmacy sale ${sale.id}: short ${remaining} of product ${line.productId}`)
      }
    }
  }

  // Platform fee (charged in addition to the appointment fee).
  const platformFee = computePharmacyPlatformFee(total, input.costTotal ?? 0, config)
  let creditBalanceAfter = (await db.clinic.findUnique({ where: { id: clinicId }, select: { creditBalance: true } }))?.creditBalance ?? 0

  if (platformFee > 0) {
    const lastEntry = await db.creditLedger.findFirst({ where: { clinicId }, orderBy: { createdAt: 'desc' } })
    creditBalanceAfter = (lastEntry?.balanceAfter ?? 0) - platformFee
    await db.creditLedger.create({
      data: {
        clinicId,
        type: 'debit',
        amount: platformFee,
        reason: 'pharmacy_fee',
        pharmacySaleId: sale.id,
        balanceAfter: creditBalanceAfter,
      },
    })
    await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: creditBalanceAfter } })
  }

  return { saleId: sale.id, subtotal, discount, tax, total, platformFee, creditBalanceAfter }
}
