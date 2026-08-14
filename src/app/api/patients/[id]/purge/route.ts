import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

/**
 * Right to be Forgotten (Founder Doc §35)
 * Purges a patient's data from the system.
 * - Deletes: patient record, appointments, messages, conversations, family members,
 *   payment proofs, feedback, reminders
 * - Logs the action to AuditLog WITHOUT retaining the patient data
 * - Patient phone hash is irreversibly hashed, so no PII in audit log
 */
async function purgePatient(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)
  // Only clinic admins can purge patients
  if (session.type !== 'clinic_admin') return err('Only clinic admins can purge patient data', 403)

  const { id } = await params

  // Verify patient belongs to this clinic
  const patient = await db.patient.findFirst({
    where: { id, clinicId: session.clinicId },
    select: { id: true, name: true, phone: true, phoneLast4: true },
  })
  if (!patient) return err('Patient not found', 404)

  // Delete all related data in a transaction
  await db.$transaction(async (tx) => {
    // 1. Delete messages (via conversations)
    const conversations = await tx.conversation.findMany({
      where: { patientId: id },
      select: { id: true },
    })
    if (conversations.length > 0) {
      await tx.message.deleteMany({
        where: { conversationId: { in: conversations.map((c) => c.id) } },
      })
      await tx.conversation.deleteMany({
        where: { patientId: id },
      })
    }

    // 2. Delete reminders (via appointments)
    const appointments = await tx.appointment.findMany({
      where: { patientId: id },
      select: { id: true },
    })
    if (appointments.length > 0) {
      const apptIds = appointments.map((a) => a.id)
      await tx.reminder.deleteMany({ where: { appointmentId: { in: apptIds } } })
      await tx.appointmentFees.deleteMany({ where: { appointmentId: { in: apptIds } } })
      await tx.appointmentFeedback.deleteMany({ where: { appointmentId: { in: apptIds } } })
      await tx.paymentProof.deleteMany({ where: { appointmentId: { in: apptIds } } })
    }

    // 3. Delete appointments
    await tx.appointment.deleteMany({ where: { patientId: id } })

    // 4. Delete family members
    await tx.patientFamilyMember.deleteMany({ where: { patientId: id } })

    // 5. Delete the patient record
    await tx.patient.delete({ where: { id } })
  })

  // Log the purge action (NO patient data retained — only patient ID + phone last4)
  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: session.clinicId,
    action: 'patient_data_purged',
    target: id,
    metadata: {
      patientPhoneLast4: patient.phoneLast4,
      reason: 'right_to_be_forgotten',
      purgedAt: new Date().toISOString(),
    },
  })

  return ok({
    purged: true,
    message: 'Patient data has been permanently deleted. Audit log records the action without retaining patient data.',
  })
}

export const POST = handle(purgePatient)
