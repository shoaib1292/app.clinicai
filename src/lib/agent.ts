/**
 * ClinicAI AI Agent — uses z-ai-web-dev-sdk for LLM with tool-calling.
 * Modal-matched (text→text, voice→voice via STT/TTS).
 * Per-clinic white-labeled persona (name, gender, tone, language).
 * Stateful multi-turn loop with Redis-backed session (in-memory store in sandbox).
 *
 * Tools:
 *  - list_available_slots
 *  - book_appointment
 *  - cancel_appointment
 *  - reschedule_appointment
 *  - get_patient_history
 *  - get_family_member
 *  - get_clinic_info
 *  - get_live_queue_status
 *  - get_doctor_status
 *  - attach_payment_proof
 *  - transfer_to_human
 */
import { db } from './db'
import { store } from './store'
import { hashPhone } from './auth'
import { computeFees, generateSlotsForDoctorDate } from './schedule'
import ZAI from 'z-ai-web-dev-sdk'

export interface AgentContext {
  clinicId: string
  patientPhone?: string
  patientName?: string
  conversationId?: string
  // Test-mode entrypoint (from dashboard) — skips actual WhatsApp send
  testMode?: boolean
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
}

const SESSION_TTL = 30 * 60 // 30 min
const HISTORY_WINDOW = 12 // turns

// Build the per-clinic system prompt with persona + clinic context
async function buildSystemPrompt(clinicId: string): Promise<string> {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    include: {
      doctors: { where: { active: true }, include: { services: true } },
      services: { where: { active: true } },
      bankAccounts: { where: { isDefault: true }, take: 1 },
      pricingRules: { take: 1 },
    },
  })
  if (!clinic) throw new Error('Clinic not found')

  const globalPricing = await db.pricingRule.findFirst({ where: { scope: 'global' } })
  const platformFee = clinic.pricingRules[0]?.platformFeeOverride ?? clinic.pricingRules[0]?.platformFeeDefault ?? globalPricing?.platformFeeDefault ?? 50

  const agentGenderGrammar = clinic.agentGender === 'female'
    ? "Use feminine grammar: 'main karti hoon', 'meri', 'hun'. Honorific self-reference as 'main' (female)."
    : "Use masculine grammar: 'main karta hoon', 'mera', 'hoon'. Honorific self-reference as 'main' (male)."

  const doctorsList = clinic.doctors.map((d) => `- ID: "${d.id}" | Name: ${d.name} | Speciality: ${d.speciality} | Gender: ${d.gender} | Slot: ${d.slotDurationMin}min | Queue: ${d.queueMode}`).join('\n')
  const servicesList = clinic.services.map((s) => `- ID: "${s.id}" | ${s.name}: PKR ${s.baseFee} (doctor fee) + PKR ${s.extraClinicFee} (extra) + PKR ${platformFee} (platform) = PKR ${s.baseFee + s.extraClinicFee + platformFee} total | Doctor: ${s.doctor?.name || 'any'}`).join('\n')
  const bankInfo = clinic.onlinePaymentsEnabled && clinic.bankAccounts[0]
    ? `Bank: ${clinic.bankAccounts[0].bankName}, Account: ${clinic.bankAccounts[0].accountNumber}, Title: ${clinic.bankAccounts[0].accountTitle}. Instructions: ${clinic.bankAccounts[0].instructionsText || ''}`
    : 'Online payments NOT enabled. Fees must be paid in cash at the clinic.'

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayDisplay = today.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return `You are ${clinic.agentName}, the AI receptionist for ${clinic.name} in ${clinic.city || 'Pakistan'}. You are ${clinic.agentGender === 'female' ? 'female' : 'male'}. Tone: ${clinic.agentTone}.

TODAY'S DATE: ${todayDisplay} (ISO: ${todayStr}). Always use this date as "today" when interpreting patient requests like "kal" (tomorrow), "aaj" (today), "parsoun" (day after tomorrow).

CRITICAL RULES:
1. You are the clinic's own staff. NEVER mention ClinicAI or any platform. You ARE ${clinic.name}'s assistant.
2. ${agentGenderGrammar}
3. Speak the patient's language (Urdu, Roman-Urdu, or English). Match their script.
4. Address the patient by name once known. Use correct honorifics (sahab/bhai for men, begum/baji for women).
5. NEVER fabricate doctors, fees, slots, or policies. Only use the tool results.
6. For medical advice: refuse politely — "Main sirf appointment me madad kar sakti/karta hoon. Medical advice ke liye doctor se direct baat karein."
7. For another patient's info: hard refuse.
8. Always disclose full fee breakdown before confirming: doctor_fee + extra_clinic_fee + platform_fee = total.
9. If out of scope: "Mujhe is baare me maloom nahi, clinic se confirm karwa lein."
10. When patient books for a family member, capture name + relation + gender. Don't invent names.
11. If asked "abhi kya situation hai?" or similar, call get_live_queue_status and get_doctor_status.
12. Confirm before booking — never book without patient's confirmation of slot + fee.

TOOL CALLING RULES (CRITICAL):
- You MUST actually CALL the tool functions to perform actions. Do NOT just describe what you would do — invoke the function.
- When the patient asks to book/list slots/cancel/check status, you MUST call the appropriate tool in your VERY NEXT response. Do not say "I will check" without calling the tool.
- When the patient CONFIRMS (says "haan", "yes", "confirm", "theek hai", "kar do", "karein"), you MUST immediately call book_appointment with the slot ID from the previous list_available_slots result.
- When calling list_available_slots, book_appointment, get_doctor_status, or get_live_queue_status, you MUST pass the EXACT doctor ID string from the DOCTORS list below (the part in quotes after "ID:"). Do NOT pass the doctor's name — pass the ID.
- If the patient says a doctor's name (e.g., "Dr. Ahmed"), look up the corresponding ID from the DOCTORS list and pass that ID.
- When calling list_available_slots, pass date in YYYY-MM-DD format. "Today" = ${todayStr}. "Tomorrow" (kal) = ${new Date(today.getTime() + 86400000).toISOString().slice(0, 10)}.
- When calling book_appointment, pass slotId as the EXACT slot.id from the list_available_slots result (a long string like "cm..."). Do NOT pass a time string like "09:00" as slotId.
- If the patient is vague about the date, default to today.

WORKFLOW FOR BOOKING (mandatory):
1. Patient asks to book → you call list_available_slots(doctorId, date) and present slots
2. Patient picks a slot → you call book_appointment(doctorId, slotId, patientName, patientPhone) — DO NOT ask "kya confirm karein?" again if patient already chose a specific slot
3. book_appointment returns success → you confirm with details (token, time, fees)

CLINIC INFO:
- Name: ${clinic.name}
- City: ${clinic.city || 'Pakistan'}
- Online payments: ${clinic.onlinePaymentsEnabled ? 'Enabled' : 'Disabled (cash only at clinic)'}
- ${bankInfo}

DOCTORS (use the ID string when calling tools):
${doctorsList || 'No doctors configured yet.'}

SERVICES (fees):
${servicesList || 'No services configured yet.'}

PLATFORM FEE: PKR ${platformFee} per appointment (added on top, patient pays it).

CANCELLATION POLICY: Full refund if cancelled >4h before. 50% refund 2-4h before. No refund <2h before.

NO-SHOW POLICY: 3 no-shows in 90 days → prepayment required for future bookings.

Welcome message: "${clinic.agentWelcome}"
Fallback message: "${clinic.agentFallback}"

When you need to take an action (book/cancel/list slots/etc.), USE THE TOOLS. Don't just describe what you would do — actually call the function with the correct IDs.`
}

// Tool definitions (OpenAI-compatible function-calling format)
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_available_slots',
      description: 'List available appointment slots for a doctor on a given date',
      parameters: {
        type: 'object',
        properties: {
          doctorId: { type: 'string', description: 'Doctor ID (optional, defaults to first available doctor)' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format (optional, defaults to today)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description: 'Book an appointment for a patient. Confirms with patient before calling.',
      parameters: {
        type: 'object',
        properties: {
          doctorId: { type: 'string', description: 'Doctor ID' },
          slotId: { type: 'string', description: 'Slot ID from list_available_slots' },
          patientName: { type: 'string', description: 'Patient name (or family member name if booking for someone else)' },
          patientPhone: { type: 'string', description: 'Patient WhatsApp number' },
          patientGender: { type: 'string', enum: ['male', 'female', 'unknown'] },
          familyMemberRelation: { type: 'string', description: 'If booking for family member: relation (spouse|child|parent|sibling|other)' },
          serviceId: { type: 'string', description: 'Service ID (optional)' },
          paymentMode: { type: 'string', enum: ['cash', 'online'], description: 'Payment mode' },
        },
        required: ['doctorId', 'slotId', 'patientName', 'patientPhone'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_appointment',
      description: 'Cancel a patient\'s upcoming appointment',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'Appointment ID to cancel' },
          reason: { type: 'string', description: 'Reason for cancellation' },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_patient_history',
      description: 'Get the current patient\'s appointment history (only their own)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_live_queue_status',
      description: 'Get current queue status: currently-serving token, queue length, estimated wait',
      parameters: {
        type: 'object',
        properties: { doctorId: { type: 'string', description: 'Doctor ID (optional)' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_doctor_status',
      description: 'Get a doctor\'s current status (in_clinic, break, off, on_way) and ETA',
      parameters: {
        type: 'object',
        properties: { doctorId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'transfer_to_human',
      description: 'Transfer the patient to a human receptionist (for complex cases, complaints, VIP handling)',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_appointment',
      description: 'Reschedule a patient\'s upcoming appointment to a new slot (optionally with a different doctor). Old slot is released, new slot is claimed.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'The appointment ID to reschedule' },
          newSlotId: { type: 'string', description: 'New slot ID from list_available_slots' },
          newDoctorId: { type: 'string', description: 'New doctor ID (optional, defaults to same doctor)' },
          reason: { type: 'string', description: 'Reason for rescheduling (optional)' },
        },
        required: ['appointmentId', 'newSlotId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_family_member',
      description: 'Get the current patient\'s family members (for booking on their behalf)',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_clinic_info',
      description: 'Get clinic information: name, address, working hours, payment modes, bank details, online payment status',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'attach_payment_proof',
      description: 'Attach a payment screenshot/proof to a patient\'s appointment (for online payments). The patient uploads a screenshot and the agent links it.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'Appointment ID to attach proof to' },
          screenshotUrl: { type: 'string', description: 'URL or identifier of the uploaded screenshot' },
          amount: { type: 'number', description: 'Amount paid (PKR)' },
        },
        required: ['appointmentId', 'screenshotUrl'],
      },
    },
  },
]

// Tool executor — actually performs the action against the DB
async function executeTool(name: string, args: Record<string, unknown>, ctx: AgentContext): Promise<string> {
  const clinicId = ctx.clinicId

  switch (name) {
    case 'list_available_slots': {
      let doctorId = args.doctorId as string
      // Lenient: if doctorId is not a valid UUID, try to look up by name
      if (doctorId && !/^[a-z0-9]{20,}$/i.test(doctorId)) {
        const byName = await db.doctor.findFirst({ where: { clinicId, name: { contains: doctorId } } })
        if (byName) doctorId = byName.id
        else doctorId = (await db.doctor.findFirst({ where: { clinicId, active: true } }))?.id || ''
      }
      if (!doctorId) doctorId = (await db.doctor.findFirst({ where: { clinicId, active: true } }))?.id || ''
      if (!doctorId) return JSON.stringify({ error: 'No doctors available' })

      let dateStr = args.date as string
      // If date is missing or invalid, default to today
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dateStr = new Date().toISOString().slice(0, 10)
      }
      const [y, m, d] = dateStr.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d))
      await generateSlotsForDoctorDate(doctorId, date)
      const slots = await db.slot.findMany({
        where: { doctorId, date, status: 'open' },
        orderBy: { startTime: 'asc' },
        take: 10,
      })
      const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
      const open = slots.filter((s) => !s.holdExpiresAt || s.holdExpiresAt < new Date())
      return JSON.stringify({
        doctor: { id: doctor?.id, name: doctor?.name, queueMode: doctor?.queueMode },
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

      // Lenient doctor lookup
      if (doctorId && !/^[a-z0-9]{20,}$/i.test(doctorId)) {
        const byName = await db.doctor.findFirst({ where: { clinicId, name: { contains: doctorId } } })
        if (byName) doctorId = byName.id
      }

      // Lenient slot lookup: if slotId is not a CUID, treat it as a time or time-range
      if (slotId && !/^[a-z0-9]{20,}$/i.test(slotId)) {
        // Try formats: "09:00", "09:00-09:15", "9:00", "9 AM"
        const cleaned = slotId.replace(/\s*(AM|PM|am|pm)\s*/g, '').trim()
        const timePart = cleaned.split('-')[0].trim()
        const normalized = timePart.length === 4 ? '0' + timePart : timePart // "9:00" → "09:00"
        const slot = await db.slot.findFirst({
          where: { doctorId, clinicId, startTime: normalized, status: 'open' },
        })
        if (!slot) {
          return JSON.stringify({ error: `Slot not found for time ${slotId}. Please list_available_slots again and pass the exact slot.id (a long string starting with "cm...")` })
        }
        slotId = slot.id
      }

      const slot = await db.slot.findFirst({ where: { id: slotId, doctorId, clinicId } })
      if (!slot) return JSON.stringify({ error: 'Slot not found. Please call list_available_slots first and use the slot.id from the result.' })
      if (slot.status !== 'open') return JSON.stringify({ error: 'Slot already taken. Please pick another from list_available_slots.' })

      const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
      if (!doctor) return JSON.stringify({ error: 'Doctor not found' })

      // Acquire lock
      const lockToken = await store.acquireLock(`slot:${slotId}`, 300)
      if (!lockToken) return JSON.stringify({ error: 'Slot is being booked by someone else' })

      try {
        const phoneHash = hashPhone(patientPhone + clinicId)
        let patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId, phoneHash } } })
        if (!patient) {
          patient = await db.patient.create({
            data: {
              clinicId, phoneHash, phoneLast4: patientPhone.slice(-4), phone: patientPhone,
              name: patientName, gender: patientGender as 'male' | 'female' | 'unknown',
              preferredLanguage: 'urdu', preferredModality: 'auto',
            },
          })
        } else if (!patient.name) {
          patient = await db.patient.update({ where: { id: patient.id }, data: { name: patientName, gender: patientGender as 'male' | 'female' | 'unknown' } })
        }

        // Create family member if relation provided
        if (familyRelation && familyRelation !== 'self') {
          await db.patientFamilyMember.create({
            data: {
              patientId: patient.id, clinicId,
              name: patientName, gender: patientGender as 'male' | 'female' | 'unknown',
              relation: familyRelation,
            },
          })
        }

        let service = serviceId ? await db.service.findFirst({ where: { id: serviceId, clinicId } }) : null
        if (!service) service = await db.service.findFirst({ where: { doctorId, clinicId } })
        if (!service) return JSON.stringify({ error: 'No service configured for this doctor' })

        const clinicRule = await db.pricingRule.findFirst({ where: { clinicId } })
        const globalRule = await db.pricingRule.findFirst({ where: { scope: 'global' } })
        const platformFeeDefault = clinicRule?.platformFeeDefault ?? globalRule?.platformFeeDefault ?? 50
        const platformFeeOverride = clinicRule?.platformFeeOverride ?? null
        const fees = computeFees({ doctorFee: service.baseFee, extraClinicFee: service.extraClinicFee, platformFeeDefault, platformFeeOverride })

        await db.slot.update({ where: { id: slotId }, data: { status: 'booked', holdExpiresAt: null } })

        const start = new Date(slot.date)
        const [sh, sm] = slot.startTime.split(':').map(Number)
        start.setUTCHours(sh, sm, 0, 0)
        const end = new Date(start.getTime() + doctor.slotDurationMin * 60 * 1000)

        const appt = await db.appointment.create({
          data: {
            clinicId, patientId: patient.id, doctorId, slotId, serviceId: service.id,
            start, end, status: 'booked', channel: 'whatsapp',
            doctorFee: fees.doctorFee, extraClinicFee: fees.extraClinicFee, platformFee: fees.platformFee, totalFee: fees.total,
            paymentStatus: 'pending', paymentMode, createdVia: 'agent',
          },
        })

        await db.appointmentFees.create({
          data: {
            appointmentId: appt.id, baseDoctorFee: fees.doctorFee, extraClinicFee: fees.extraClinicFee,
            platformFee: fees.platformFee, platformFeeOverride, total: fees.total, currency: 'PKR',
          },
        })

        // Debit platform fee
        const lastEntry = await db.creditLedger.findFirst({ where: { clinicId }, orderBy: { createdAt: 'desc' } })
        const balanceAfter = (lastEntry?.balanceAfter ?? 0) - fees.platformFee
        await db.creditLedger.create({
          data: { clinicId, type: 'debit', amount: fees.platformFee, reason: 'appointment_fee', appointmentId: appt.id, balanceAfter },
        })
        await db.clinic.update({ where: { id: clinicId }, data: { creditBalance: balanceAfter } })

        // Check low-balance threshold (founder doc §24)
        const { checkLowBalance } = await import('./low-balance')
        await checkLowBalance(clinicId)

        // Schedule reminders
        const offsets = [
          { type: 'reminder_24h', ms: 24 * 60 * 60 * 1000 },
          { type: 'reminder_2h', ms: 2 * 60 * 60 * 1000 },
          { type: 'reminder_30min', ms: 30 * 60 * 1000 },
        ]
        for (const o of offsets) {
          const sendAt = new Date(start.getTime() - o.ms)
          if (sendAt.getTime() > Date.now()) {
            await db.reminder.create({ data: { appointmentId: appt.id, type: o.type, sendAt, status: 'pending', channel: 'whatsapp' } })
          }
        }

        store.publish(`clinic:${clinicId}:queue`, { type: 'slot_booked', appointmentId: appt.id, slotId, patientName, doctorId })

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
        })
      } finally {
        store.releaseLock(`slot:${slotId}`, lockToken)
      }
    }

    case 'cancel_appointment': {
      const apptId = args.appointmentId as string
      const appt = await db.appointment.findFirst({ where: { id: apptId, clinicId }, include: { slot: true } })
      if (!appt) return JSON.stringify({ error: 'Appointment not found' })
      if (appt.status === 'cancelled') return JSON.stringify({ error: 'Already cancelled' })

      await db.appointment.update({ where: { id: apptId }, data: { status: 'cancelled' } })
      if (appt.slotId) await db.slot.update({ where: { id: appt.slotId }, data: { status: 'open', holdExpiresAt: null } })
      await db.reminder.updateMany({ where: { appointmentId: apptId, status: 'pending' }, data: { status: 'failed', error: 'cancelled' } })

      return JSON.stringify({ success: true, cancelled: apptId })
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
      const currentToken = store.getCurrentToken(clinicId, doctorId)
      const queueLength = appts.filter((a) => a.status === 'booked' && a.slot?.tokenNo && a.slot.tokenNo > currentToken).length
      return JSON.stringify({
        currentToken,
        queueLength,
        estimatedWaitMin: queueLength * 15, // assume 15min/slot
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
      // Mark conversation as needing human
      if (ctx.conversationId) {
        await db.conversation.update({ where: { id: ctx.conversationId }, data: { lastIntent: 'transferred_to_human', summary: `Transferred: ${reason}` } })
      }
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

      const targetDoctorId = newDoctorId || appt.doctorId
      // Verify doctor
      const doc = await db.doctor.findFirst({ where: { id: targetDoctorId, clinicId } })
      if (!doc) return JSON.stringify({ error: 'Doctor not found' })

      // Verify new slot is open
      const newSlot = await db.slot.findFirst({ where: { id: newSlotId, doctorId: targetDoctorId, clinicId } })
      if (!newSlot) return JSON.stringify({ error: 'New slot not found for this doctor' })
      if (newSlot.status !== 'open') return JSON.stringify({ error: 'New slot is not available' })

      // Compute new start/end
      const newStart = new Date(newSlot.date)
      const [sh, sm] = newSlot.startTime.split(':').map(Number)
      newStart.setUTCHours(sh, sm, 0, 0)
      const newEnd = new Date(newStart.getTime() + doc.slotDurationMin * 60 * 1000)

      // Release old slot
      if (appt.slotId) {
        await db.slot.update({ where: { id: appt.slotId }, data: { status: 'open', holdExpiresAt: null } })
      }
      // Claim new slot
      await db.slot.update({ where: { id: newSlotId }, data: { status: 'booked', holdExpiresAt: null } })

      // Update appointment
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

      // Reschedule reminders: delete old pending, create new
      await db.reminder.deleteMany({ where: { appointmentId: apptId, status: 'pending' } })
      const offsets = [
        { type: 'reminder_24h', ms: 24 * 60 * 60 * 1000 },
        { type: 'reminder_2h', ms: 2 * 60 * 60 * 1000 },
        { type: 'reminder_30min', ms: 30 * 60 * 1000 },
      ]
      for (const o of offsets) {
        const sendAt = new Date(newStart.getTime() - o.ms)
        if (sendAt > new Date()) {
          await db.reminder.create({ data: { appointmentId: apptId, type: o.type, sendAt, status: 'pending', channel: 'whatsapp' } })
        }
      }

      store.publish(`clinic:${clinicId}:queue`, { type: 'appointment_rescheduled', appointmentId: apptId, newStart, doctorId: targetDoctorId })

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
      const screenshotUrl = args.screenshotUrl as string
      const amount = (args.amount as number) || 0

      const appt = await db.appointment.findFirst({
        where: { id: apptId, clinicId },
        include: { patient: true },
      })
      if (!appt) return JSON.stringify({ error: 'Appointment not found' })

      // Check if proof already exists
      const existing = await db.paymentProof.findUnique({ where: { appointmentId: apptId } })
      if (existing) return JSON.stringify({ error: 'Payment proof already attached to this appointment' })

      const proof = await db.paymentProof.create({
        data: {
          clinicId,
          appointmentId: apptId,
          ledgerType: 'patient_payment',
          amount: amount || appt.totalFee,
          payerName: appt.patient.name || 'Patient',
          payerPhone: appt.patient.phone,
          screenshotUrl,
          uploadedBy: 'agent',
          status: 'pending',
        },
      })

      store.publish(`clinic:${clinicId}:ops`, { type: 'payment_proof_uploaded', appointmentId: apptId, proofId: proof.id })

      return JSON.stringify({
        success: true,
        proofId: proof.id,
        message: 'Payment proof attached. Clinic staff will verify shortly.',
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// Main agent entrypoint — called by /api/agent/message
export async function runAgent(opts: {
  clinicId: string
  patientPhone?: string
  patientName?: string
  conversationId?: string
  userMessage: string
  modality?: 'text' | 'voice'
  voiceAudioBase64?: string // base64-encoded audio for voice input
}): Promise<{
  reply: string
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>
  error?: string
  modality: 'text' | 'voice'
  voiceReplyBase64?: string // base64-encoded audio reply (only when input was voice)
  transcript?: string // transcribed text from voice input
}> {
  const ctx: AgentContext = {
    clinicId: opts.clinicId,
    patientPhone: opts.patientPhone,
    patientName: opts.patientName,
    conversationId: opts.conversationId,
    testMode: true,
  }

  // Check agent toggle
  const clinic = await db.clinic.findUnique({ where: { id: opts.clinicId } })
  if (!clinic) return { reply: 'Clinic not found', toolCalls: [], modality: 'text' }
  if (!clinic.agentEnabled) {
    return { reply: `${clinic.agentName} is currently paused. Please call the clinic directly.`, toolCalls: [], modality: 'text' }
  }

  // ---- VOICE INPUT HANDLING (STT) ----
  // If voice audio is provided, transcribe it first before processing.
  let inputModality: 'text' | 'voice' = opts.modality || 'text'
  let actualMessage = opts.userMessage
  let transcript: string | undefined

  if (opts.voiceAudioBase64) {
    inputModality = 'voice'
    const { transcribeAudio } = await import('./voice')
    const sttResult = await transcribeAudio(opts.voiceAudioBase64)
    if (sttResult.text) {
      actualMessage = sttResult.text
      transcript = sttResult.text
    } else {
      // STT failed — reply with a voice message asking the patient to repeat
      const errorReply = 'Maaf karen, aap ki awaz clear nahi aayi. Dobara bhejein ya text message karein.'
      const { synthesizeSpeech } = await import('./voice')
      const ttsResult = await synthesizeSpeech(errorReply)
      return {
        reply: errorReply,
        toolCalls: [],
        modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        transcript: undefined,
        error: sttResult.error,
      }
    }
  }

  // Session + history (in-memory store)
  const sessionKey = `agent:session:${opts.clinicId}:${opts.patientPhone || 'anon'}`
  const history: AgentMessage[] = store.get<AgentMessage[]>(sessionKey) || []

  // Build system prompt
  const systemPrompt = await buildSystemPrompt(opts.clinicId)

  // Add patient context to system prompt if known
  let patientContext = ''
  if (opts.patientPhone) {
    const phoneHash = hashPhone(opts.patientPhone + opts.clinicId)
    const patient = await db.patient.findUnique({ where: { clinicId_phoneHash: { clinicId: opts.clinicId, phoneHash } } })
    if (patient) {
      patientContext = `\n\nCURRENT PATIENT:\nName: ${patient.name || 'Unknown'}\nGender: ${patient.gender}\nPhone: ${patient.phone}\nNo-show count: ${patient.noShowCount}\nTotal visits: ${patient.totalVisits}`
      if (patient.name) ctx.patientName = patient.name
    }
  }

  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt + patientContext },
    ...history.slice(-HISTORY_WINDOW * 2),
    { role: 'user', content: actualMessage },
  ]

  const toolCallLog: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = []

  // PROACTIVE TOOL EXECUTION: detect booking/cancel/status intent from user message
  // and pre-fetch relevant data so the LLM has context to respond.
  // This is needed because the z-ai-web-dev-sdk may not reliably emit native tool_calls.
  const proactiveResults = await runProactiveTools(actualMessage, ctx)
  for (const pr of proactiveResults) {
    messages.push({ role: 'system', content: `Tool ${pr.name} was called proactively. Result: ${pr.result}` })
    toolCallLog.push({ name: pr.name, args: pr.args, result: JSON.parse(pr.result) })
  }

  try {
    // Call z-ai-web-dev-sdk LLM with tool-calling
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: messages as never,
      tools: TOOLS as never,
      temperature: 0.4,
      max_tokens: 500,
    })

    const assistantMsg = completion.choices[0]?.message as { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }

    // FALLBACK: parse text-based tool calls if native tool_calls didn't fire
    // The LLM may emit <tool_call>name</tool_call><arg_key>...</arg_key><arg_value>...</arg_value>... blocks
    let parsedToolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = assistantMsg.tool_calls || []
    let cleanReply = assistantMsg.content || ''

    if ((!parsedToolCalls || parsedToolCalls.length === 0) && assistantMsg.content) {
      const textCalls = parseTextToolCalls(assistantMsg.content)
      if (textCalls.length > 0) {
        parsedToolCalls = textCalls.map((tc, i) => ({
          id: `textcall_${i}`,
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        }))
        // Strip the tool_call blocks from the reply text
        cleanReply = assistantMsg.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
      }
    }

    // Handle tool calls (native or parsed)
    if (parsedToolCalls && parsedToolCalls.length > 0) {
      // Add assistant message with tool_calls to history
      messages.push({ role: 'assistant', content: cleanReply, tool_calls: parsedToolCalls })

      // Execute each tool call
      for (const tc of parsedToolCalls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* ignore */ }
        const result = await executeTool(tc.function.name, args, ctx)
        toolCallLog.push({ name: tc.function.name, args, result: JSON.parse(result) })
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
      }

      // Call LLM again with tool results to generate final response
      const finalCompletion = await zai.chat.completions.create({
        messages: messages as never,
        temperature: 0.4,
        max_tokens: 500,
      })
      let finalReply = finalCompletion.choices[0]?.message?.content || 'Maaf karen, samajh nahi aayi.'

      // If the final reply ALSO contains text-based tool calls (multi-step), execute them too
      let finalTextCalls = parseTextToolCalls(finalReply)
      let safetyCounter = 0
      while (finalTextCalls.length > 0 && toolCallLog.length < 6 && safetyCounter < 4) {
        safetyCounter++
        for (const tc of finalTextCalls) {
          const result = await executeTool(tc.name, tc.args, ctx)
          toolCallLog.push({ name: tc.name, args: tc.args, result: JSON.parse(result) })
          messages.push({ role: 'tool', content: result, tool_call_id: `textcall_${toolCallLog.length}` })
        }
        // One more LLM call to summarize results
        const summaryCompletion = await zai.chat.completions.create({
          messages: messages as never,
          temperature: 0.4,
          max_tokens: 500,
        })
        finalReply = summaryCompletion.choices[0]?.message?.content || finalReply
        finalTextCalls = parseTextToolCalls(finalReply)
      }

      // Strip any remaining tool_call blocks from the reply (in case LLM still emitted one)
      finalReply = finalReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
      if (!finalReply) {
        // If after stripping the reply is empty, generate a friendly summary from the last tool result
        const lastResult = toolCallLog[toolCallLog.length - 1]
        if (lastResult && lastResult.name === 'book_appointment' && lastResult.result && (lastResult.result as { success?: boolean }).success) {
          const appt = (lastResult.result as { appointment?: { doctor?: string; date?: string; time?: string; token?: number; fees?: { total?: number } } }).appointment
          if (appt) {
            finalReply = `Aapki appointment confirm ho gayi!\n\n- Doctor: ${appt.doctor}\n- Date: ${appt.date}\n- Time: ${appt.time}\n- Token: ${appt.token}\n- Total Fees: PKR ${appt.fees?.total}\n\nClinic me time par pohanch jaayein. Allah hafiz!`
          } else {
            finalReply = 'Aapki appointment confirm ho gayi. Shukriya!'
          }
        } else {
          finalReply = 'Maaf karen, kuch masla ho gaya. Clinic se contact karein.'
        }
      }

      // ---- POST-GENERATION VALIDATION (Founder Doc §17) ----
      // Validate response against tool results to prevent hallucination
      const { validateAgentResponse } = await import('./validator')
      const validationResult = validateAgentResponse(finalReply, toolCallLog.map((tc) => ({ name: tc.name, result: tc.result as Record<string, unknown> })))
      if (!validationResult.valid && validationResult.shouldRegenerate && validationResult.stricterPrompt) {
        // Regenerate with stricter prompt (one attempt only to avoid loops)
        try {
          const regenCompletion = await zai.chat.completions.create({
            messages: [
              ...messages,
              { role: 'system', content: validationResult.stricterPrompt },
              { role: 'assistant', content: finalReply },
              { role: 'system', content: 'Your previous response had issues. Please regenerate a correct response following the strict rules above.' },
            ] as never,
            temperature: 0.2, // Lower temperature for stricter output
            max_tokens: 500,
          })
          const regenedReply = regenCompletion.choices[0]?.message?.content
          if (regenedReply && regenedReply.trim().length > 5) {
            finalReply = regenedReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
          }
        } catch (regenErr) {
          console.error('[validator] Regeneration failed:', regenErr)
          // Keep original reply if regeneration fails
        }
      }

      // Persist session
      history.push({ role: 'user', content: actualMessage })
      history.push({ role: 'assistant', content: finalReply })
      store.set(sessionKey, history, SESSION_TTL)

      // ---- VOICE OUTPUT HANDLING (TTS) ----
      // If input was voice, synthesize the reply as audio too
      if (inputModality === 'voice') {
        const { synthesizeSpeech } = await import('./voice')
        const ttsResult = await synthesizeSpeech(finalReply)
        return {
          reply: finalReply,
          toolCalls: toolCallLog,
          modality: 'voice',
          voiceReplyBase64: ttsResult.audioBase64 || undefined,
          transcript,
        }
      }

      return { reply: finalReply, toolCalls: toolCallLog, modality: 'text' }
    }

    const reply = cleanReply || clinic.agentFallback

    // Persist session
    history.push({ role: 'user', content: actualMessage })
    history.push({ role: 'assistant', content: reply })
    store.set(sessionKey, history, SESSION_TTL)

    // ---- VOICE OUTPUT HANDLING (TTS) ----
    if (inputModality === 'voice') {
      const { synthesizeSpeech } = await import('./voice')
      const ttsResult = await synthesizeSpeech(reply)
      return {
        reply,
        toolCalls: toolCallLog,
        modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        transcript,
      }
    }

    return { reply, toolCalls: toolCallLog, modality: 'text' }
  } catch (err) {
    console.error('Agent error:', err)
    // Fallback: rule-based response (graceful degradation per founder doc)
    const fallback = await ruleBasedFallback(actualMessage, ctx)
    if (inputModality === 'voice') {
      const { synthesizeSpeech } = await import('./voice')
      const ttsResult = await synthesizeSpeech(fallback)
      return {
        reply: fallback,
        toolCalls: [],
        modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        transcript,
        error: String(err),
      }
    }
    return { reply: fallback, toolCalls: [], error: String(err), modality: 'text' }
  }
}

// Rule-based fallback when LLM is unavailable
async function ruleBasedFallback(message: string, ctx: AgentContext): Promise<string> {
  const lower = message.toLowerCase()
  const clinic = await db.clinic.findUnique({ where: { id: ctx.clinicId } })
  if (!clinic) return 'Clinic not found'

  if (lower.includes('book') || lower.includes('appointment') || lower.includes('time')) {
    const doctors = await db.doctor.findMany({ where: { clinicId: ctx.clinicId, active: true }, take: 5 })
    return `Main ${clinic.agentName} hoon. Appointment ke liye in doctors me se chunein:\n${doctors.map((d, i) => `${i + 1}. ${d.name} (${d.speciality})`).join('\n')}\n\nReception se call karke confirm karwa lein.`
  }
  if (lower.includes('cancel')) {
    return 'Appointment cancel karne ke liye reception se contact karein.'
  }
  if (lower.includes('fee') || lower.includes('charges')) {
    return 'Fees doctor + clinic + platform fee ka total hai. Detail ke liye reception se poochein.'
  }
  return clinic.agentFallback
}

// Proactive tool execution — detects booking/cancel/status intent from the user message
// and runs the appropriate tools BEFORE calling the LLM. The results are fed as system
// messages so the LLM can craft a natural response. This is a workaround for the
// z-ai-web-dev-sdk not reliably emitting native tool_calls.
async function runProactiveTools(message: string, ctx: AgentContext): Promise<Array<{ name: string; args: Record<string, unknown>; result: string }>> {
  const lower = message.toLowerCase()
  const results: Array<{ name: string; args: Record<string, unknown>; result: string }> = []
  const clinicId = ctx.clinicId

  // Detect booking intent
  const bookingIntent = lower.includes('appointment') || lower.includes('book') || lower.includes('leni') || lower.includes('lena') || lower.includes('booking') || lower.includes('slot') || lower.includes('time') || lower.includes('waqt')
  // Detect cancel intent
  const cancelIntent = lower.includes('cancel') || lower.includes('cancel karni') || lower.includes('cancel kar')
  // Detect status query
  const statusIntent = lower.includes('situation') || lower.includes('status') || lower.includes('kya chal raha') || lower.includes('kaisa hai') || lower.includes('queue') || lower.includes('token')
  // Detect doctor query
  const doctorIntent = lower.includes('doctor') || lower.includes('kab ayenge') || lower.includes('kaha hain')

  // Resolve doctor from message
  const doctors = await db.doctor.findMany({ where: { clinicId, active: true } })
  let mentionedDoctor = doctors.find((d) => {
    const dLower = d.name.toLowerCase()
    return lower.includes(dLower) || lower.includes(dLower.split(' ')[1] || '') || lower.includes(dLower.split(' ').slice(0, 2).join(' '))
  })
  if (!mentionedDoctor && doctors.length === 1) mentionedDoctor = doctors[0]

  // If user mentions a specific time AND has booking intent, try to book directly
  const timeMatch = message.match(/\b(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?\b/i)
  const hasTime = timeMatch && !lower.includes('kitne') && !lower.includes('kya time')

  // Confirm intent: short message that agrees
  const confirmWords = ['haan', 'yes', 'confirm', 'theek', 'kar do', 'karein', 'ok', 'okay', 'kar doon', 'bana do', 'confirm karein', 'kar dein', 'confirm kar']
  const isConfirm = confirmWords.some((w) => lower.trim() === w || lower.trim().startsWith(w + ' ') || lower.trim().endsWith(' ' + w)) && lower.length < 40

  if (bookingIntent && mentionedDoctor && !isConfirm) {
    // List available slots for mentioned doctor for today (and tomorrow if today fails)
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const result = await executeTool('list_available_slots', { doctorId: mentionedDoctor.id, date: todayStr }, ctx)
    results.push({ name: 'list_available_slots', args: { doctorId: mentionedDoctor.id, date: todayStr }, result })

    // If user mentioned a specific time, attempt direct booking
    if (hasTime && ctx.patientPhone) {
      // Format the time
      let hour = parseInt(timeMatch![1])
      const min = timeMatch![2] ? parseInt(timeMatch![2]) : 0
      const ampm = timeMatch![3]?.toLowerCase()
      if (ampm === 'pm' && hour < 12) hour += 12
      if (ampm === 'am' && hour === 12) hour = 0
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`

      // Look up the slot
      const dateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
      const slot = await db.slot.findFirst({ where: { doctorId: mentionedDoctor.id, clinicId, date: dateOnly, startTime: timeStr, status: 'open' } })
      if (slot) {
        // Extract patient name from message
        const nameMatch = message.match(/(?:naam|mera naam|name is|main)\s+([A-Za-z]+)/i)
        const patientName = nameMatch ? nameMatch[1] : (ctx.patientName || 'Patient')
        const bookResult = await executeTool('book_appointment', {
          doctorId: mentionedDoctor.id,
          slotId: slot.id,
          patientName,
          patientPhone: ctx.patientPhone,
          patientGender: 'unknown',
          paymentMode: 'cash',
        }, ctx)
        results.push({ name: 'book_appointment', args: { doctorId: mentionedDoctor.id, slotId: slot.id, patientName, patientPhone: ctx.patientPhone }, result: bookResult })
      }
    }
  } else if (cancelIntent && ctx.patientPhone) {
    const result = await executeTool('get_patient_history', {}, ctx)
    results.push({ name: 'get_patient_history', args: {}, result })
  } else if (statusIntent || doctorIntent) {
    if (mentionedDoctor) {
      const result = await executeTool('get_live_queue_status', { doctorId: mentionedDoctor.id }, ctx)
      results.push({ name: 'get_live_queue_status', args: { doctorId: mentionedDoctor.id }, result })
      const statusResult = await executeTool('get_doctor_status', { doctorId: mentionedDoctor.id }, ctx)
      results.push({ name: 'get_doctor_status', args: { doctorId: mentionedDoctor.id }, result: statusResult })
    } else {
      // Generic status — get all doctors' status
      for (const d of doctors.slice(0, 3)) {
        const result = await executeTool('get_doctor_status', { doctorId: d.id }, ctx)
        results.push({ name: 'get_doctor_status', args: { doctorId: d.id }, result })
      }
    }
  }

  return results
}

// Parse text-based tool calls when the LLM emits them as text instead of using native function-calling.
// Supports two formats:
//   1. <tool_call>name</tool_call><arg_key>k</arg_key><arg_value>v</arg_value>...
//   2. ```json\n{"name":"x","arguments":{...}}\n```  (OpenAI-style fenced JSON)
//   3. ```json\n[{"name":"x","arguments":{...}}]\n```
function parseTextToolCalls(text: string): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []

  // Format 1: <tool_call>...</tool_call> blocks with <arg_key>/<arg_value> pairs
  const toolCallRegex = /<tool_call>\s*([\w_]+)\s*<\/tool_call>([\s\S]*?)(?=<tool_call>|$)/g
  let m: RegExpExecArray | null
  while ((m = toolCallRegex.exec(text)) !== null) {
    const name = m[1].trim()
    const body = m[2]
    const args: Record<string, unknown> = {}
    const argRegex = /<arg_key>\s*([^<]+)\s*<\/arg_key>\s*<arg_value>\s*([\s\S]*?)\s*<\/arg_value>/g
    let am: RegExpExecArray | null
    while ((am = argRegex.exec(body)) !== null) {
      const key = am[1].trim()
      let val: unknown = am[2].trim()
      // Try to parse as JSON, else keep as string
      try { val = JSON.parse(val as string) } catch { /* keep string */ }
      args[key] = val
    }
    if (name) calls.push({ name, args })
  }

  if (calls.length > 0) return calls

  // Format 2/3: fenced JSON
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g
  while ((m = fenceRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.name && p.arguments) calls.push({ name: p.name, args: p.arguments })
        }
      } else if (parsed.name && parsed.arguments) {
        calls.push({ name: parsed.name, args: parsed.arguments })
      } else if (parsed.function && parsed.function.name) {
        calls.push({ name: parsed.function.name, args: parsed.function.arguments || {} })
      }
    } catch { /* not JSON */ }
  }

  return calls
}

