import { db } from './db'

interface TelemedicineChargeInput {
  roomName: string
  clinicId: string
  appointmentId?: string
  doctorId?: string
  patientId?: string
  startedAt?: Date | string
  endedAt?: Date | string
}

export async function chargeTelemedicineCall(input: TelemedicineChargeInput) {
  // Idempotency: check if already charged
  const existing = await db.telemedicineSession.findUnique({ where: { roomName: input.roomName } })
  if (existing && existing.billingStatus === 'charged') return existing

  const startedAt = input.startedAt ? new Date(input.startedAt) : new Date()
  const endedAt = input.endedAt ? new Date(input.endedAt) : new Date()
  const durationMinutes = Math.max(1, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60000))
  const ratePerMinute = 1
  const amountCharged = durationMinutes * ratePerMinute

  const session = await db.$transaction(async (tx) => {
    // Upsert the session record
    const session = await tx.telemedicineSession.upsert({
      where: { roomName: input.roomName },
      create: {
        roomName: input.roomName,
        clinicId: input.clinicId,
        appointmentId: input.appointmentId ?? null,
        doctorId: input.doctorId ?? null,
        patientId: input.patientId ?? null,
        startedAt,
        endedAt,
        durationMinutes,
        ratePerMinute,
        amountCharged,
        billingStatus: amountCharged > 0 ? 'charged' : 'pending',
      },
      update: {
        endedAt,
        durationMinutes,
        amountCharged,
        billingStatus: amountCharged > 0 ? 'charged' : 'pending',
      },
    })

    if (amountCharged > 0) {
      // Debit clinic wallet
      const clinic = await tx.clinic.findUnique({ where: { id: input.clinicId }, select: { creditBalance: true } })
      const balanceBefore = clinic?.creditBalance ?? 0
      const balanceAfter = balanceBefore - amountCharged

      await tx.clinic.update({
        where: { id: input.clinicId },
        data: { creditBalance: balanceAfter },
      })

      await tx.creditLedger.create({
        data: {
          clinicId: input.clinicId,
          type: 'debit',
          amount: amountCharged,
          reason: 'telemedicine_fee',
          appointmentId: input.appointmentId ?? null,
          balanceAfter,
        },
      })
    }

    return session
  })

  return session
}
