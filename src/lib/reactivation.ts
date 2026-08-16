/**
 * Dormant Reactivation (Founder Doc §31)
 * Finds patients inactive for 90 days and queues reactivation messages.
 * Runs as a cron job (or manual trigger).
 */
import { db } from './db'
import { store } from './store'

const DORMANT_DAYS = Number(process.env.DORMANT_THRESHOLD_DAYS) || 90

/**
 * Find dormant patients (no appointment in the last 90 days) for a clinic.
 * Returns patients with their last appointment date.
 */
export async function findDormantPatients(clinicId: string): Promise<Array<{
  patientId: string
  patientName: string | null
  patientPhone: string
  lastVisit: Date | null
  daysDormant: number
}>> {
  const thresholdDate = new Date(Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000)

  // Find patients whose most recent appointment is before the threshold
  const patients = await db.patient.findMany({
    where: {
      clinicId,
      appointments: {
        every: {
          start: { lt: thresholdDate },
        },
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      appointments: {
        orderBy: { start: 'desc' },
        take: 1,
        select: { start: true },
      },
    },
  })

  return patients.map((p) => {
    const lastVisit = p.appointments[0]?.start || null
    const daysDormant = lastVisit
      ? Math.floor((Date.now() - lastVisit.getTime()) / (24 * 60 * 60 * 1000))
      : DORMANT_DAYS
    return {
      patientId: p.id,
      patientName: p.name,
      patientPhone: p.phone,
      lastVisit,
      daysDormant,
    }
  }).filter((p) => p.daysDormant >= DORMANT_DAYS)
}

/**
 * Queue reactivation messages for dormant patients.
 * In production, this would enqueue BullMQ jobs to send WhatsApp messages.
 * In sandbox, we log + publish realtime events.
 */
export async function reactivateDormantPatients(clinicId: string): Promise<{
  found: number
  queued: number
}> {
  const dormant = await findDormantPatients(clinicId)

  for (const p of dormant) {
    // Dedup: only queue once per 30 days per patient
    const dedupKey = `reactivation_queued:${clinicId}:${p.patientId}`
    if (await store.get(dedupKey)) continue

    // Queue the reactivation message (in production, this would be a BullMQ job)
    await store.set(dedupKey, true, 30 * 24 * 60 * 60) // 30-day dedup

    // Publish realtime event so clinic staff can see reactivation activity
    await store.publish(`clinic:${clinicId}:ops`, {
      type: 'reactivation_queued',
      patientId: p.patientId,
      patientName: p.patientName,
      daysDormant: p.daysDormant,
    })

    console.log(`[reactivation] Queued for ${p.patientName || p.patientPhone} (dormant ${p.daysDormant} days)`)
  }

  return { found: dormant.length, queued: dormant.length }
}

/**
 * Process reactivation for all clinics (called by cron job).
 */
export async function processAllClinicReactivations(): Promise<{ clinics: number; totalQueued: number }> {
  const clinics = await db.clinic.findMany({
    where: { status: 'active', agentEnabled: true },
    select: { id: true },
  })

  let totalQueued = 0
  for (const clinic of clinics) {
    const result = await reactivateDormantPatients(clinic.id)
    totalQueued += result.queued
  }

  return { clinics: clinics.length, totalQueued }
}
