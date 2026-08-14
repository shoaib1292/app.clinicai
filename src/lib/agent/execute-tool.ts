import { db } from '../db'
import { store } from '../store'
import { hashPhone, decrypt, last4, randomToken } from '../auth'
import { encryptPhone } from '../phone-encryption'
import { decryptPhone } from '../phone-encryption'
import { computeFees, generateSlotsForDoctorDate, computeRefund, resolveDuration, findBlockingOverride } from '../schedule'
import { publishAppointmentBooked } from '../automation-publisher'
import type { AgentContext } from './types'

export async function executeTool(name: string, args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const clinicId = ctx.clinicId

  switch (name) {
    case 'list_available_slots': {
      let doctorId = args.doctorId as string
      if (doctorId && !/^[a-z0-9]{20,}$/i.test(doctorId)) {
        const byName = await db.doctor.findFirst({ where: { clinicId, name: { contains: doctorId } } })
        if (byName) doctorId = byName.id
        else doctorId = (await db.doctor.findFirst({ where: { clinicId, active: true } }))?.id || ''
      }
      if (!doctorId) doctorId = (await db.doctor.findFirst({ where: { clinicId, active: true } }))?.id || ''
      if (!doctorId) return JSON.stringify({ error: 'No doctors available' })

      let dateStr = args.date as string
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateStr = new Date().toISOString().slice(0, 10)
      }
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d))

      const serviceId = args.serviceId as string | undefined
      let effectiveDuration = args.durationMin as number | undefined
      if (serviceId && !effectiveDuration) {
        effectiveDuration = await resolveDuration(clinicId, doctorId, serviceId)
      }

      await generateSlotsForDoctorDate(doctorId, date, effectiveDuration)
      const slots = await db.slot.findMany({
        where: { doctorId, date, status: 'open' },
        orderBy: { startTime: 'asc' },
        take: 50,
      })
      const doctor = await db.doctor.findUnique({ where: { id: doctorId } })

      let open = slots.filter((s) => !s.holdExpiresAt || s.holdExpiresAt < new Date())

      const now = new Date()
      const pktNow = new Date(now.getTime() + 5 * 60 * 60 * 1000)
      const todayPktStart = new Date(Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate()))
      const targetDateUTC = new Date(Date.UTC(y, m - 1, d))
      if (targetDateUTC.getTime() === todayPktStart.getTime()) {
        const currentPktMinutes = pktNow.getUTCHours() * 60 + pktNow.getUTCMinutes()
        open = open.filter((s) => {
          const [sh, sm] = s.startTime.split(':').map(Number)
          return (sh * 60 + sm) >= currentPktMinutes
        })
      }

      return JSON.stringify({
        doctor: { id: doctor?.id, name: doctor?.name, queueMode: doctor?.queueMode },
        serviceId: serviceId || undefined,
        durationMin: effectiveDuration || doctor?.slotDurationMin,
        date: dateStr,
        slots: open.map((s) => ({ id: s.id, startTime: s.startTime, endTime: s.endTime, tokenNo: s.tokenNo })),
      })
    }

    case 'book_appointment': {
      let doctorId = args.doctorId as string
      let slotId = args.slotId as string
      const patientName = args.patientName as string
      const patientPhone = args.patientPhone as string
      const patientGender = (args.patientGender as string) || 'unknown'
      const familyRelation = args.familyMemberRelation as string | undefined
      const serviceId = args.serviceId as string | undefined
      const paymentMode = (args.paymentMode as string) || 'cash'
      const bookingDateStr = typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : undefined
      const bookingDate = bookingDateStr
        ? new Date(Date.UTC(...(bookingDateStr.split('-').map(Number) as [number, number, number])))
        : undefined

      if (doctorId && !/^[a-z0-9]{20,}$/i.test(doctorId)) {
        const byName = await db.doctor.findFirst({ where: { clinicId, name: { contains: doctorId } } })
        if (byName) doctorId = byName.id
      }

      if (slotId && !/^[a-z0-9]{20,}$/i.test(slotId)) {
        const underscoreParts = slotId.split('_')
        if (underscoreParts.length >= 3) {
          const lastPart = underscoreParts[underscoreParts.length - 1]
          const timeMatch2 = lastPart.match(/^(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?$/)
          if (timeMatch2) {
            const timeStr = `${timeMatch2[1].padStart(2, '0')}:${timeMatch2[2]}`
            const slot = await db.slot.findFirst({
              where: { clinicId, startTime: timeStr, status: 'open', ...(bookingDate ? { date: bookingDate } : {}) },
            })
            if (slot) {
              slotId = slot.id
              doctorId = slot.doctorId
            }
          }
        }
        if (!slotId || /^[a-z0-9]{20,}$/i.test(slotId)) {
          // Already resolved
        } else {
          const cleaned = slotId.replace(/\s*(AM|PM|am|pm)\s*/g, '').trim()
          const timePart = cleaned.split(/[-–—to]+/)[0].trim()
          const parts = timePart.split(':')
          let normalized = timePart
          if (parts.length >= 2) {
            normalized = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
          } else if (parts.length === 1 && timePart.length <= 2) {
            normalized = `${timePart.padStart(2, '0')}:00`
          }
          let slot = await db.slot.findFirst({
            where: { doctorId, clinicId, startTime: normalized, status: 'open', ...(bookingDate ? { date: bookingDate } : {}) },
          })
          if (!slot) {
            slot = await db.slot.findFirst({
              where: { doctorId, clinicId, startTime: { startsWith: normalized.slice(0, 5) }, status: 'open', ...(bookingDate ? { date: bookingDate } : {}) },
            })
          }
          if (!slot) {
            slot = await db.slot.findFirst({
              where: { clinicId, startTime: normalized, status: 'open', ...(bookingDate ? { date: bookingDate } : {}) },
            })
            if (slot) doctorId = slot.doctorId
          }
          if (slot) slotId = slot.id
        }
        if (!/^[a-z0-9]{20,}$/i.test(slotId || '')) {
          return JSON.stringify({ error: `Slot not found for time ${slotId}. Please list_available_slots again and pass the exact slot.id (a long string starting with "cm...")` })
        }
      }

      const slot = await db.slot.findFirst({ where: { id: slotId, doctorId, clinicId } })
      if (!slot) return JSON.stringify({ error: 'Slot not found. Please call list_available_slots first and use the slot.id from the result.' })
      if (slot.status !== 'open') {
        const nextSlot = await db.slot.findFirst({
          where: { doctorId, clinicId, date: slot.date, status: 'open' },
          orderBy: { startTime: 'asc' },
        })
        if (nextSlot) {
          return JSON.stringify({
            retryable: true,
            alternativeSlot: { id: nextSlot.id, startTime: nextSlot.startTime, tokenNo: nextSlot.tokenNo },
            message: `Selected slot at ${slot.startTime} already taken. Suggest the next available slot at ${nextSlot.startTime} (Token #${nextSlot.tokenNo}).`,
          })
        }
        return JSON.stringify({ error: 'Slot already taken. Please pick another from list_available_slots.' })
      }

      const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
      if (!doctor) return JSON.stringify({ error: 'Doctor not found' })

      // Check for active schedule overrides on this date
      const slotDate2 = new Date(slot.date)
      const dateOnly2 = new Date(Date.UTC(slotDate2.getUTCFullYear(), slotDate2.getUTCMonth(), slotDate2.getUTCDate()))
      const blockingOverride = await db.scheduleOverride.findFirst({
        where: { doctorId, date: dateOnly2, type: { in: ['leave', 'block'] }, deletedAt: null },
      })
      if (blockingOverride) {
        if (blockingOverride.type === 'leave') {
          return JSON.stringify({ error: 'Doctor is on leave for this date. Please suggest another date.' })
        }
        if (blockingOverride.startTime && blockingOverride.endTime) {
          const overlap = slot.startTime < blockingOverride.endTime && slot.endTime > blockingOverride.startTime
          if (overlap) {
            return JSON.stringify({ error: 'This time slot falls within a blocked range. Please suggest an alternative time.' })
          }
        }
      }

      const lockToken = await store.acquireLock(`slot:${slotId}`, 300)
      if (!lockToken) return JSON.stringify({ error: 'Slot is being booked by someone else' })

      try {
        const phoneHash = hashPhone(patientPhone + clinicId)
        let patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
        if (!patient) {
          patient = await db.patient.create({
            data: {
              clinicId, phoneHash, phoneLast4: last4(patientPhone), phone: encryptPhone(patientPhone),
              name: patientName, gender: patientGender as 'male' | 'female' | 'unknown',
              preferredLanguage: 'urdu', preferredModality: 'auto',
              email: (args.patientEmail as string) || null,
            },
          })
        } else if (!patient.name) {
          patient = await db.patient.update({ where: { id: patient.id }, data: { name: patientName, gender: patientGender as 'male' | 'female' | 'unknown', ...(args.patientEmail ? { email: args.patientEmail as string } : {}) } })
        }

        const { checkNoShowPolicy } = await import('../no-show-policy')
        const noShowCheck = checkNoShowPolicy({
          patientId: patient.id,
          noShowCount: patient.noShowCount,
          totalVisits: patient.totalVisits,
        })
        if (noShowCheck.blocked) {
          await store.releaseLock(`slot:${slotId}`, lockToken)
          return JSON.stringify({ error: noShowCheck.message || 'Aap ki 3 se zyada appointments no-show hain. Clinic se rabta karein.' })
        }

        // ── ADAPTIVE NO-SHOW RISK (FREE rule-based) ──
        // Compute risk from history for reminder consent wording.
        // Reminders are NOT auto-created — the agent asks patient first
        // and calls set_reminder_preference based on the answer.
        let riskSummary: { score: number; isHighRisk: boolean; lastIncidentType: string | null } = {
          score: 0, isHighRisk: false, lastIncidentType: null,
        }
        let riskNeedsPrepayNote = false
        let riskScore = 0
        try {
          const { getRiskSummary } = await import('./no-show-risk')
          const hist = await db.appointment.findMany({
            where: { clinicId, patientId: patient.id },
            select: { status: true, start: true },
            orderBy: { start: 'desc' },
            take: 20,
          })
          const risk = getRiskSummary(
            { noShowCount: patient.noShowCount, totalVisits: patient.totalVisits },
            hist.map((a) => ({ status: a.status, start: a.start })),
          )
          riskSummary = {
            score: risk.score,
            isHighRisk: risk.isHighRisk,
            lastIncidentType: risk.lastIncidentType,
          }
          if (risk.isHighRisk) {
            riskNeedsPrepayNote = true
            riskScore = risk.score
          }
          console.log(`[agent] no-show risk for ${patient.id}: ${risk.score}/100 — isHighRisk=${risk.isHighRisk}`)
        } catch (riskErr) {
          console.error('[agent] risk computation failed:', riskErr)
        }

        if (familyRelation && familyRelation !== 'self') {
          const existing = await db.patientFamilyMember.findFirst({
            where: { patientId: patient.id, name: patientName },
          })
          if (!existing) {
            await db.patientFamilyMember.create({
              data: {
                patientId: patient.id, clinicId,
                name: patientName, gender: patientGender as 'male' | 'female' | 'unknown',
                relation: familyRelation,
              },
            })
          }
        }

        let service = serviceId ? await db.service.findFirst({ where: { id: serviceId, clinicId } }) : null
        if (!service) service = await db.service.findFirst({ where: { doctorId, clinicId } })
        if (!service) return JSON.stringify({ error: 'No service configured for this doctor' })

        const clinicRule = await db.pricingRule.findFirst({ where: { clinicId } })
        const globalRule = await db.pricingRule.findFirst({ where: { scope: 'global' } })
        const platformFeeDefault = clinicRule?.platformFeeDefault ?? globalRule?.platformFeeDefault ?? 50
        const platformFeeOverride = clinicRule?.platformFeeOverride ?? null
        const markupMin = clinicRule?.markupMin ?? globalRule?.markupMin ?? 0
        const markupMax = clinicRule?.markupMax ?? globalRule?.markupMax ?? 500
        const clinicMarkup = Math.min(markupMax, Math.max(markupMin, clinicRule?.markupDefault ?? globalRule?.markupDefault ?? 0))
        const fees = computeFees({ doctorFee: service.baseFee, clinicMarkup, platformFeeDefault, platformFeeOverride })

        // Atomic conditional claim: only transition an OPEN slot to BOOKED.
        // This is concurrency-safe across processes (DB-level constraint),
        // so two simultaneous bookings for the same slot cannot both succeed.
        const claimResult = await db.slot.updateMany({
          where: { id: slotId, status: 'open' },
          data: { status: 'booked', holdExpiresAt: null },
        })
        if (claimResult.count === 0) {
          await store.releaseLock(`slot:${slotId}`, lockToken)
          const nextSlot = await db.slot.findFirst({
            where: { doctorId, clinicId, date: slot.date, status: 'open' },
            orderBy: { startTime: 'asc' },
          })
          if (nextSlot) {
            return JSON.stringify({
              retryable: true,
              alternativeSlot: { id: nextSlot.id, startTime: nextSlot.startTime, tokenNo: nextSlot.tokenNo },
              message: `Selected slot at ${slot.startTime} was just taken. Suggest the next available slot at ${nextSlot.startTime} (Token #${nextSlot.tokenNo}).`,
            })
          }
          return JSON.stringify({ error: 'Slot was just taken. Please pick another from list_available_slots.' })
        }

        const start = new Date(slot.date)
        const [sh, sm] = slot.startTime.split(':').map(Number)
        const pktMin = sh * 60 + sm
        const utcMin = pktMin - 300
        start.setTime(start.getTime() + utcMin * 60 * 1000)
        const duration = slot.durationMin || doctor.slotDurationMin
        const end = new Date(start.getTime() + duration * 60 * 1000)

        const appt = await db.appointment.create({
          data: {
            clinicId, patientId: patient.id, doctorId, slotId, serviceId: service.id,
            start, end, status: 'booked', channel: 'whatsapp',
            doctorFee: fees.doctorFee, clinicMarkup: fees.clinicMarkup, platformFee: fees.platformFee, totalFee: fees.total,
            paymentStatus: 'pending', paymentMode, createdVia: 'agent',
          },
        })

        if (riskNeedsPrepayNote) {
          await db.appointment.update({ where: { id: appt.id }, data: { notes: `ADAPTIVE: high no-show risk (${riskScore}). prepay nudge scheduled.` } }).catch(() => {})
        }

        await db.appointmentFees.create({
          data: {
            appointmentId: appt.id, baseDoctorFee: fees.doctorFee, clinicMarkup: fees.clinicMarkup,
            platformFee: fees.platformFee, platformFeeOverride, total: fees.total, currency: 'PKR',
          },
        })

        const lastEntry = await db.creditLedger.findFirst({ where: { clinicId }, orderBy: { createdAt: 'desc' } })
        const balanceAfter = (lastEntry?.balanceAfter ?? 0) - fees.platformFee
        await db.creditLedger.create({
          data: { clinicId, type: 'debit', amount: fees.platformFee, reason: 'appointment_fee', appointmentId: appt.id, balanceAfter },
        })
        await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: balanceAfter } })

        const { checkLowBalance } = await import('../low-balance')
        await checkLowBalance(clinicId)

        await store.publish(`clinic:${clinicId}:queue`, { type: 'slot_booked', appointmentId: appt.id, slotId, patientName, doctorId })

        const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } })
        publishAppointmentBooked(clinicId, {
          id: appt.id,
          status: 'booked',
          patientId: patient.id,
          doctorId,
          start: appt.start.toISOString(),
          end: appt.end.toISOString(),
          totalFee: fees.total,
        }, {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
        }, {
          id: doctorId,
          name: doctor.name,
        }, clinic?.name || 'Unknown Clinic').catch(() => {})

        return JSON.stringify({
          success: true,
          appointment: {
            id: appt.id,
            doctor: doctor.name,
            date: start.toLocaleDateString('en-PK'),
            time: slot.startTime,
            token: slot.tokenNo,
            fees,
          },
          risk: riskSummary,
        })
      } finally {
        await store.releaseLock(`slot:${slotId}`, lockToken)
      }
    }

    case 'cancel_appointment': {
      const apptId = args.appointmentId as string
      const appt = await db.appointment.findFirst({
        where: { id: apptId, clinicId },
        include: { slot: true },
      })
      if (!appt) return JSON.stringify({ error: 'Appointment not found' })
      if (appt.status === 'cancelled') return JSON.stringify({ error: 'Already cancelled' })

      // Ownership check: the appointment must belong to the authenticated patient.
      if (ctx.patientPhone) {
        const owner = await db.patient.findUnique({
          where: { clinicId_phoneHash: { clinicId, phoneHash: hashPhone(ctx.patientPhone + clinicId) } },
        })
        if (owner && appt.patientId !== owner.id) {
          return JSON.stringify({ error: 'You can only cancel your own appointments' })
        }
      }

      const refund = computeRefund(appt.start, appt.platformFee || 0)

      await db.appointment.update({
        where: { id: apptId },
        data: {
          status: 'cancelled',
          slotId: null,
          paymentStatus: refund > 0 ? 'refund_due' : (appt.paymentStatus === 'paid' || appt.paymentStatus === 'refund_due' ? appt.paymentStatus : 'refunded'),
        },
      })

      if (appt.slotId) {
        await db.slot.update({
          where: { id: appt.slotId },
          data: { status: 'open', holdExpiresAt: null },
        })
      }

      await db.reminder.updateMany({
        where: { appointmentId: apptId, status: 'pending' },
        data: { status: 'failed', error: 'cancelled' },
      })

      if (refund > 0) {
        const lastEntry = await db.creditLedger.findFirst({
          where: { clinicId },
          orderBy: { createdAt: 'desc' },
        })
        const balanceAfter = (lastEntry?.balanceAfter ?? 0) + refund
        await db.creditLedger.create({
          data: {
            clinicId,
            type: 'credit',
            amount: refund,
            reason: 'refund',
            appointmentId: apptId,
            balanceAfter,
          },
        })
        await db.clinic.update({
          where: { id: clinicId },
          data: { creditBalance: balanceAfter },
        })
      }

      await store.publish(`clinic:${clinicId}:queue`, {
        type: 'slot_cancelled',
        appointmentId: apptId,
        slotId: appt.slotId,
        refund,
      })

      return JSON.stringify({ success: true, cancelled: apptId, refund })
    }

    case 'get_patient_history': {
      if (!ctx.patientPhone) return JSON.stringify({ error: 'No patient context' })
      const phoneHash = hashPhone(ctx.patientPhone + clinicId)
      const patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
      if (!patient) return JSON.stringify({ appointments: [], family: [] })
      const [appts, family] = await Promise.all([
        db.appointment.findMany({ where: { patientId: patient.id }, take: 10, orderBy: { start: 'desc' }, include: { doctor: true } }),
        db.patientFamilyMember.findMany({ where: { patientId: patient.id } }),
      ])
      return JSON.stringify({
        patient: { name: patient.name, gender: patient.gender, noShowCount: patient.noShowCount, totalVisits: patient.totalVisits },
        appointments: appts.map((a) => ({ id: a.id, doctor: a.doctor.name, start: a.start, status: a.status, totalFee: a.totalFee })),
        familyMembers: family.map((f) => ({ name: f.name, relation: f.relation, gender: f.gender })),
      })
    }

    case 'get_live_queue_status': {
      const doctorId = args.doctorId as string
      const today = new Date()
      const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      const appts = await db.appointment.findMany({
        where: { clinicId, doctorId, start: { gte: todayStart, lt: todayEnd }, status: { in: ['booked', 'completed'] } },
        orderBy: { start: 'asc' },
        include: { slot: true },
      })
      const doctor = await db.doctor.findUnique({
        where: { id: doctorId },
        select: { slotDurationMin: true, queueMode: true },
      })
      const slotDuration = doctor?.slotDurationMin || 15
      const isTimeMode = doctor?.queueMode === 'time'

      let queueLength: number
      if (isTimeMode) {
        // Time-mode clinics have no token numbers. Use check-in state instead:
        // queue = booked appointments whose start is after the last-checked-in
        // appointment's start time (or all bookings still in the future).
        const checkedIn = appts.filter((a) => a.status === 'completed')
        const currentStart = checkedIn.length
          ? Math.max(...checkedIn.map((a) => a.start.getTime()))
          : todayStart.getTime()
        queueLength = appts.filter(
          (a) => a.status === 'booked' && a.start.getTime() > currentStart,
        ).length
      } else {
        const currentToken = await store.getCurrentToken(clinicId, doctorId)
        queueLength = appts.filter(
          (a) => a.status === 'booked' && a.slot?.tokenNo && a.slot.tokenNo > currentToken,
        ).length
      }

      return JSON.stringify({
        queueLength,
        estimatedWaitMin: queueLength * slotDuration,
        totalToday: appts.length,
      })
    }

    case 'get_doctor_status': {
      const doctorId = args.doctorId as string
      const doctor = await db.doctor.findFirst({ where: { id: doctorId, clinicId } })
      if (!doctor) return JSON.stringify({ error: 'Doctor not found' })
      return JSON.stringify({
        name: doctor.name,
        status: doctor.currentStatus,
        etaMin: doctor.statusEta,
      })
    }

    case 'transfer_to_human': {
      const reason = args.reason as string
      if (ctx.conversationId) {
        await db.conversation.update({ where: { id: ctx.conversationId }, data: { lastIntent: 'transferred_to_human', summary: `Transferred: ${reason}` } })
      }
      await store.publish(`clinic:${clinicId}:ops`, {
        type: 'agent_escalated',
        conversationId: ctx.conversationId,
        reason,
        timestamp: new Date().toISOString(),
      })
      return JSON.stringify({ success: true, message: 'Patient transferred to human receptionist' })
    }

    case 'reschedule_appointment': {
      const apptId = args.appointmentId as string
      const newSlotId = args.newSlotId as string
      const newDoctorId = (args.newDoctorId as string) || undefined
      const reason = args.reason as string | undefined

      const appt = await db.appointment.findFirst({
        where: { id: apptId, clinicId },
        include: { slot: true },
      })
      if (!appt) return JSON.stringify({ error: 'Appointment not found' })
      if (appt.status === 'cancelled' || appt.status === 'completed' || appt.status === 'invalid') {
        return JSON.stringify({ error: `Cannot reschedule a ${appt.status} appointment` })
      }

      // Ownership check: the appointment must belong to the authenticated patient.
      if (ctx.patientPhone) {
        const owner = await db.patient.findUnique({
          where: { clinicId_phoneHash: { clinicId, phoneHash: hashPhone(ctx.patientPhone + clinicId) } },
        })
        if (owner && appt.patientId !== owner.id) {
          return JSON.stringify({ error: 'You can only reschedule your own appointments' })
        }
      }

      const targetDoctorId = newDoctorId || appt.doctorId
      const doc = await db.doctor.findFirst({ where: { id: targetDoctorId, clinicId } })
      if (!doc) return JSON.stringify({ error: 'Doctor not found' })

      const lockToken = await store.acquireLock(`slot:${newSlotId}`, 300)
      if (!lockToken) return JSON.stringify({ error: 'New slot is being booked by someone else' })

      try {
        const newSlot = await db.slot.findFirst({ where: { id: newSlotId, doctorId: targetDoctorId, clinicId } })
        if (!newSlot) return JSON.stringify({ error: 'New slot not found for this doctor' })
        if (newSlot.status !== 'open') return JSON.stringify({ error: 'New slot is not available' })

        // Enforce the same leave/block rules as booking
        const blocking = await findBlockingOverride({
          doctorId: targetDoctorId,
          slotDate: new Date(newSlot.date),
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
        })
        if (blocking?.type === 'leave') {
          return JSON.stringify({ error: 'Doctor is on leave for that date. Please suggest another date.' })
        }
        if (blocking?.type === 'block') {
          return JSON.stringify({ error: 'That time slot falls within a blocked range. Please suggest an alternative time.' })
        }

        const newStart = new Date(newSlot.date)
        const [sh, sm] = newSlot.startTime.split(':').map(Number)
        const pktMin2 = sh * 60 + sm
        const utcMin2 = pktMin2 - 300
        newStart.setTime(newStart.getTime() + utcMin2 * 60 * 1000)
        const newDuration = newSlot.durationMin || doc.slotDurationMin
        const newEnd = new Date(newStart.getTime() + newDuration * 60 * 1000)

        // Claim the NEW slot first (atomic open->booked), THEN release the old one,
        // so a failure mid-way cannot leave an orphaned booked slot or double-booking.
        const claimNew = await db.slot.updateMany({
          where: { id: newSlotId, status: 'open' },
          data: { status: 'booked', holdExpiresAt: null },
        })
        if (claimNew.count === 0) {
          await store.releaseLock(`slot:${newSlotId}`, lockToken)
          return JSON.stringify({ error: 'New slot was just taken. Please pick another.' })
        }
        if (appt.slotId) {
          await db.slot.update({ where: { id: appt.slotId }, data: { status: 'open', holdExpiresAt: null } })
        }

        const updated = await db.appointment.update({
          where: { id: apptId },
          data: {
            start: newStart,
            end: newEnd,
            slotId: newSlotId,
            doctorId: targetDoctorId,
            status: 'booked',
            notes: reason ? `${appt.notes || ''}\nRescheduled by agent: ${reason}`.trim() : appt.notes,
          },
        })

        await db.reminder.deleteMany({ where: { appointmentId: apptId, status: 'pending' } })
        const offsets = [
          { type: 'reminder_30min' as const, ms: 30 * 60 * 1000 },
        ]
        for (const o of offsets) {
          const sendAt = new Date(newStart.getTime() - o.ms)
          if (sendAt > new Date()) {
            await db.reminder.create({ data: { appointmentId: apptId, type: o.type, sendAt, status: 'pending', channel: 'whatsapp' } })
          }
        }

        await store.publish(`clinic:${clinicId}:queue`, { type: 'appointment_rescheduled', appointmentId: apptId, newStart, doctorId: targetDoctorId })

        return JSON.stringify({
          success: true,
          appointment: {
            id: updated.id,
            doctor: doc.name,
            date: newStart.toLocaleDateString('en-PK'),
            time: newSlot.startTime,
            token: newSlot.tokenNo,
          },
        })
      } finally {
        await store.releaseLock(`slot:${newSlotId}`, lockToken)
      }
    }

    case 'get_family_member': {
      if (!ctx.patientPhone) return JSON.stringify({ error: 'No patient context' })
      const phoneHash = hashPhone(ctx.patientPhone + clinicId)
      const patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
      if (!patient) return JSON.stringify({ familyMembers: [] })
      const family = await db.patientFamilyMember.findMany({ where: { patientId: patient.id }, orderBy: { createdAt: 'asc' } })
      return JSON.stringify({
        patient: { name: patient.name, gender: patient.gender },
        familyMembers: family.map((f) => ({ id: f.id, name: f.name, relation: f.relation, gender: f.gender })),
      })
    }

    case 'get_clinic_info': {
      const clinic = await db.clinic.findUnique({
        where: { id: clinicId },
        include: {
          bankAccounts: { where: { isDefault: true }, take: 1 },
          doctors: { where: { active: true }, select: { name: true, speciality: true, currentStatus: true } },
        },
      })
      if (!clinic) return JSON.stringify({ error: 'Clinic not found' })
      const bank = clinic.bankAccounts[0]
      return JSON.stringify({
        name: clinic.name,
        city: clinic.city,
        status: clinic.status,
        agentEnabled: clinic.agentEnabled,
        onlinePaymentsEnabled: clinic.onlinePaymentsEnabled,
        settlementMode: clinic.settlementMode,
        creditBalance: clinic.creditBalance,
        bankDetails: clinic.onlinePaymentsEnabled && bank ? {
          bankName: bank.bankName,
          accountTitle: bank.accountTitle,
          accountNumber: bank.accountNumber,
          iban: bank.iban,
          walletType: bank.walletType,
          walletNumber: bank.walletNumber,
          instructions: bank.instructionsText,
        } : null,
        doctors: clinic.doctors.map((d) => ({ name: d.name, speciality: d.speciality, status: d.currentStatus })),
      })
    }

    case 'attach_payment_proof': {
      const apptId = args.appointmentId as string
      const screenshotUrl = args.screenshotUrl as string | undefined
      const amount = (args.amount as number) || 0

      const appt = await db.appointment.findFirst({
        where: { id: apptId, clinicId },
        include: { patient: true },
      })
      if (!appt) return JSON.stringify({ error: 'Appointment not found' })

      const existing = await db.paymentProof.findUnique({ where: { appointmentId: apptId } })
      if (existing) return JSON.stringify({ error: 'Payment proof already attached to this appointment' })

      const proof = await db.paymentProof.create({
        data: {
          clinicId,
          appointmentId: apptId,
          ledgerType: 'patient_payment',
          amount: amount || appt.totalFee,
          payerName: appt.patient.name || 'Patient',
          payerPhone: decryptPhone(appt.patient.phone),
          screenshotUrl: screenshotUrl || `/uploads/whatsapp-proof-${Date.now()}.png`,
          uploadedBy: 'agent',
          status: 'pending',
        },
      })

      await store.publish(`clinic:${clinicId}:ops`, { type: 'payment_proof_uploaded', appointmentId: apptId, proofId: proof.id })

      return JSON.stringify({
        success: true,
        proofId: proof.id,
        message: 'Payment proof attached. Clinic staff will verify shortly.',
      })
    }

    case 'add_family_member': {
      if (!ctx.patientPhone) return JSON.stringify({ error: 'No patient context' })
      const phoneHash = hashPhone(ctx.patientPhone + clinicId)
      const patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
      if (!patient) return JSON.stringify({ error: 'Patient not found' })

      const name = args.name as string
      const relation = args.relation as string
      const gender = (args.gender as string) || 'unknown'
      const notes = args.notes as string | undefined

      if (!name || !relation) return JSON.stringify({ error: 'Name and relation required' })

      const existing = await db.patientFamilyMember.findFirst({
        where: { patientId: patient.id, name, deletedAt: null },
      })
      if (existing) {
        return JSON.stringify({ success: true, message: 'Family member already exists', member: existing })
      }

      const member = await db.patientFamilyMember.create({
        data: {
          patientId: patient.id,
          clinicId,
          name,
          relation,
          gender: gender as 'male' | 'female' | 'unknown',
          notes,
        },
      })

      return JSON.stringify({
        success: true,
        message: `Family member ${name} (${relation}) added`,
        member: { id: member.id, name: member.name, relation: member.relation, gender: member.gender },
      })
    }

    case 'get_booking_status': {
      const apptId = args.appointmentId as string
      if (!apptId) return JSON.stringify({ error: 'appointmentId required' })

      const appt = await db.appointment.findUnique({
        where: { id: apptId, clinicId },
        include: {
          doctor: { select: { name: true } },
          slot: { select: { startTime: true, tokenNo: true, date: true } },
          fees: true,
        },
      })

      if (!appt) return JSON.stringify({ error: 'Appointment not found' })

      const startTime = appt.slot?.startTime || ''
      const dateStr = appt.slot?.date ? new Date(appt.slot.date).toISOString().slice(0, 10) : ''

      return JSON.stringify({
        id: appt.id,
        status: appt.status,
        doctor: appt.doctor?.name,
        date: dateStr,
        time: startTime,
        tokenNo: appt.slot?.tokenNo,
        fee: appt.fees?.total || appt.totalFee,
        paymentMode: appt.paymentMode,
        channel: appt.channel,
      })
    }

    case 'set_reminder_preference': {
      const apptId = args.appointmentId as string
      const wantReminder = args.reminderNeeded as boolean
      const leadTime = (args.leadTime as string) || '30m'

      const appt = await db.appointment.findUnique({
        where: { id: apptId, clinicId },
        select: { id: true, status: true, start: true },
      })
      if (!appt) return JSON.stringify({ error: 'Appointment not found' })
      if (appt.status === 'cancelled') return JSON.stringify({ error: 'Appointment already cancelled' })

      let leadMs: number
      if (leadTime === '1d' || leadTime === '24h') leadMs = 24 * 60 * 60 * 1000
      else if (leadTime === '2h') leadMs = 2 * 60 * 60 * 1000
      else if (leadTime === '1h') leadMs = 60 * 60 * 1000
      else leadMs = 30 * 60 * 1000

      if (wantReminder) {
        const sendAt = new Date(appt.start.getTime() - leadMs)
        if (sendAt > new Date()) {
          await db.reminder.create({
            data: {
              appointmentId: apptId,
              type: 'reminder_consent',
              sendAt,
              status: 'pending',
              channel: 'whatsapp',
            },
          })
        }
      }

      return JSON.stringify({
        success: true,
        message: wantReminder
          ? `Reminder scheduled ${leadTime} before appointment.`
          : 'No reminder will be sent.',
      })
    }

    case 'send_portal_link': {
      const appUserId = args.appUserId as string
      const patientPhone = args.patientPhone as string

      if (!appUserId || !clinicId || !patientPhone) {
        return JSON.stringify({ error: 'appUserId, clinicId, and patientPhone are required' })
      }

      const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
      if (!clinic) return JSON.stringify({ error: 'Clinic not found' })
      if (!clinic.patientPortalEnabled) {
        return JSON.stringify({
          success: false,
          message: 'Patient portal is not yet enabled for this clinic. The clinic admin can enable it from the dashboard.',
        })
      }

      const token = randomToken(32)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      await db.patientMagicLink.create({
        data: { token, appUserId, clinicId, phone: patientPhone, expiresAt },
      })

      const domain = process.env.DOMAIN || 'localhost:8000'
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const link = `${protocol}://${domain}/p/${clinic.slug}?t=${token}`

      return JSON.stringify({
        success: true,
        link,
        message: `Yeh raha aap ka portal link: ${link}. Is par click karein aur apni appointments manage karein, live queue dekhein, aur booking karein — bilkul mobile app ki tarah!`,
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}
