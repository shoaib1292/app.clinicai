/**
 * EMERGENCY BULK EMAIL — clinic-side situations only (e.g. doctor absent,
 * clinic closed, emergency). Sends to patients who have a booked appointment
 * and a captured email. Uses Brevo (free) — NOT WhatsApp — so there is ZERO
 * risk of the clinic's WhatsApp number getting banned by bulk outbound.
 *
 * IMPORTANT (per founder rule): this is NOT marketing. It only targets patients
 * who already booked. No opt-in required (it's transactional/operational).
 * Campaigns/marketing bulk is removed from the MVP entirely.
 */

import { db } from './db'
import { sendEmail } from './notifications'
import { store } from './store'

export interface EmergencyEmailResult {
  targeted: number
  sent: number
  failed: number
  skippedNoEmail: number
  rateLimited?: boolean
}

// Limit clinics to ONE emergency bulk email per 24h — this is operational
// communication, not a marketing tool. Prevents abuse / spamming patients.
const EMERGENCY_COOLDOWN_SEC = 24 * 60 * 60

/**
 * Notify all patients with a booked appointment and a captured email, via
 * email, about an operational situation (doctor absent, clinic closed, etc).
 * Uses Brevo (free) — NOT WhatsApp — so the clinic's WA number stays safe.
 *
 * Rate-limited: one emergency send per clinic per 24h (enforced via store).
 * Returns { rateLimited: true } if called again inside the cooldown window.
 */
export async function sendEmergencyEmailToPatients(
  clinicId: string,
  reason: string,
  situationLabel = 'Important Clinic Update',
): Promise<EmergencyEmailResult> {
  // ── Cooldown guard (prevents fake/bulk abuse) ──
  const cooldownKey = `emergency_email:${clinicId}`
  const acquired = await store.setNx(cooldownKey, Date.now(), EMERGENCY_COOLDOWN_SEC)
  if (!acquired) {
    return { targeted: 0, sent: 0, failed: 0, skippedNoEmail: 0, rateLimited: true }
  }
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { name: true, agentName: true },
  })
  if (!clinic) return { targeted: 0, sent: 0, failed: 0, skippedNoEmail: 0 }

  // Only patients who actually booked (operational, not marketing)
  const appointments = await db.appointment.findMany({
    where: {
      clinicId,
      status: 'booked',
      start: { gte: new Date() },
    },
    include: {
      patient: true,
      doctor: true,
    },
    take: 500,
  })

  let sent = 0
  let failed = 0
  let skippedNoEmail = 0

  for (const appt of appointments) {
    const email = appt.patient.email
    if (!email) {
      skippedNoEmail++
      continue
    }
    const dateStr = appt.start.toLocaleDateString('en-PK', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const timeStr = appt.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    const subject = `${clinic.name} — ${situationLabel}`
    const body =
      `Dear ${appt.patient.name || 'Patient'},\n\n` +
      `This is an important update from ${clinic.name}.\n\n` +
      `Situation: ${reason}\n\n` +
      `Your appointment with Dr. ${appt.doctor.name} on ${dateStr} at ${timeStr} ` +
      `may be affected. Please reply to this clinic on WhatsApp or call us to reschedule or confirm.\n\n` +
      `We apologize for the inconvenience.\n${clinic.name} Team`

    const res = await sendEmail(email, subject, body, undefined, {
      category: 'notification',
      clinicId,
    })
    if (res.ok) sent++
    else failed++
  }

  return {
    targeted: appointments.length,
    sent,
    failed,
    skippedNoEmail,
  }
}
