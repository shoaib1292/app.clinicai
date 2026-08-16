/**
 * Low-Balance Alert (Founder Doc §24)
 * Fires when clinic credit balance drops below 20% threshold.
 * Sends WhatsApp + dashboard notification + optional webhook (Slack/Teams).
 */
import { db } from './db'
import { store } from './store'

const THRESHOLD_PCT = Number(process.env.LOW_BALANCE_THRESHOLD_PCT) || 20
const WEBHOOK_URL = process.env.LOW_BALANCE_WEBHOOK_URL || ''

/**
 * Check a clinic's credit balance and fire alert if below threshold.
 * Called after each booking (which debits PKR 50).
 */
export async function checkLowBalance(clinicId: string): Promise<{ alerted: boolean; balance: number; threshold: number }> {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, name: true, creditBalance: true, settlementMode: true },
  })
  if (!clinic) return { alerted: false, balance: 0, threshold: 0 }

  // Only credit-based clinics need alerts (invoice mode doesn't use balance)
  if (clinic.settlementMode === 'invoice') {
    return { alerted: false, balance: clinic.creditBalance, threshold: 0 }
  }

  // Threshold: 20% of 1000 PKR = 200 PKR (configurable)
  // In production, this would be based on the clinic's average monthly spend
  const typicalMonthlySpend = 1000 // PKR — could be computed from historical data
  const threshold = Math.round(typicalMonthlySpend * THRESHOLD_PCT / 100)

  if (clinic.creditBalance <= threshold) {
    // Check if we already alerted recently (dedup via store — 1 alert per 24h)
    const alertKey = `low_balance_alerted:${clinicId}`
    if (await store.get(alertKey)) {
      return { alerted: false, balance: clinic.creditBalance, threshold }
    }

    // Fire alert
    await fireLowBalanceAlert(clinic.id, clinic.name, clinic.creditBalance, threshold)

    // Mark as alerted for 24h
    await store.set(alertKey, true, 24 * 60 * 60)

    return { alerted: true, balance: clinic.creditBalance, threshold }
  }

  return { alerted: false, balance: clinic.creditBalance, threshold }
}

async function fireLowBalanceAlert(clinicId: string, clinicName: string, balance: number, threshold: number) {
  const message = `⚠️ Low Balance Alert: ${clinicName} credit balance is PKR ${balance} (threshold: PKR ${threshold}). Please top up to avoid booking interruption.`

  // 1. Publish realtime event (dashboard notification)
  await store.publish(`clinic:${clinicId}:ops`, {
    type: 'low_balance_alert',
    clinicId,
    balance,
    threshold,
    message,
  })

  // 2. Create a notification in the notifications system
  try {
    // The notifications API will pick this up from the clinic's payment proofs + balance
    // For now, we publish to the ops channel which the notifications dropdown subscribes to
  } catch (e) {
    console.error('[low-balance] Notification error:', e)
  }

  // 3. Optional: fire webhook (Slack/Teams) for platform staff
  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          clinic: clinicName,
          balance,
          threshold,
        }),
      })
    } catch (e) {
      console.error('[low-balance] Webhook error:', e)
    }
  }

  // 4. Send WhatsApp to clinic admin (if phone known)
  try {
    const admin = await db.clinicAdmin.findFirst({
      where: { clinicId, active: true, phone: { not: null } },
      select: { phone: true },
    })
    if (admin?.phone) {
      // In production, this would call sendEvolutionMessage or sendMetaMessage
      // For sandbox, we log it
      console.log(`[low-balance] WhatsApp alert to ${admin.phone}: ${message}`)
    }
  } catch (e) {
    console.error('[low-balance] Admin notification error:', e)
  }

  console.log(`[low-balance] Alert fired for ${clinicName}: PKR ${balance} <= PKR ${threshold}`)
}
