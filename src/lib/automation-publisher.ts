/**
 * Automation Event Publisher
 *
 * Helper functions to publish automation events at key appointment
 * lifecycle points. Events are queued in the in-memory store (sandbox)
 * or Redis (production), then processed by the cron scheduler.
 *
 * In sandbox mode, events are processed via src/cron/index.ts → processAutomationEvents()
 * In production mode, events are enqueued to BullMQ → worker/automation-worker.ts
 */

import { store } from './store'
import { decryptPhone } from './phone-encryption'

export interface AutomationEventContext {
  appointment?: Record<string, unknown>
  patient?: Record<string, unknown>
  doctor?: Record<string, unknown>
  clinic?: Record<string, unknown>
  clinic_name?: string
  conversationId?: string
  [key: string]: unknown
}

/**
 * Publish an automation event for a clinic.
 * The event is queued and will be processed asynchronously.
 */
export async function publishAutomationEvent(
  clinicId: string,
  triggerEvent: string,
  context: AutomationEventContext
): Promise<void> {
  try {
    await store.enqueue('automation:events', {
      clinicId,
      triggerEvent,
      context,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`[automation] Failed to publish event ${triggerEvent}:`, err)
  }
}

/**
 * Publish appointment.booked event
 */
export async function publishAppointmentBooked(
  clinicId: string,
  appointment: Record<string, unknown>,
  patient: Record<string, unknown>,
  doctor: Record<string, unknown>,
  clinicName: string
): Promise<void> {
  await publishAutomationEvent(clinicId, 'appointment.booked', {
    appointment,
    patient: { ...patient, phone: decryptPhone(String(patient.phone ?? '')) },
    doctor,
    clinic: { name: clinicName },
    clinic_name: clinicName,
  })
}

/**
 * Publish appointment.cancelled event
 */
export async function publishAppointmentCancelled(
  clinicId: string,
  appointment: Record<string, unknown>,
  patient: Record<string, unknown>,
  clinicName: string
): Promise<void> {
  await publishAutomationEvent(clinicId, 'appointment.cancelled', {
    appointment,
    patient: { ...patient, phone: decryptPhone(String(patient.phone ?? '')) },
    clinic_name: clinicName,
  })
}

/**
 * Publish appointment.no_show event
 */
export async function publishAppointmentNoShow(
  clinicId: string,
  appointment: Record<string, unknown>,
  patient: Record<string, unknown>,
  doctor: Record<string, unknown>,
  clinicName: string
): Promise<void> {
  await publishAutomationEvent(clinicId, 'appointment.no_show', {
    appointment,
    patient: { ...patient, phone: decryptPhone(String(patient.phone ?? '')) },
    doctor,
    clinic_name: clinicName,
  })
}

/**
 * Publish appointment.completed event
 */
export async function publishAppointmentCompleted(
  clinicId: string,
  appointment: Record<string, unknown>,
  patient: Record<string, unknown>,
  doctor: Record<string, unknown>,
  clinicName: string
): Promise<void> {
  await publishAutomationEvent(clinicId, 'appointment.completed', {
    appointment,
    patient: { ...patient, phone: decryptPhone(String(patient.phone ?? '')) },
    doctor,
    clinic_name: clinicName,
  })
}
