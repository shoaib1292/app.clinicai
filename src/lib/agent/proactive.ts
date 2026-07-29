import { db } from '../db'
import { hashPhone } from '../auth'
import { executeTool } from './execute-tool'
import { FAMILY_KEYWORDS } from './types'
import type { AgentContext } from './types'

export async function runProactiveTools(message: string, ctx: AgentContext): Promise<Array<{ name: string; args: Record<string, unknown>; result: string }>> {
  const lower = message.toLowerCase()
  const results: Array<{ name: string; args: Record<string, unknown>; result: string }> = []
  const clinicId = ctx.clinicId

  const bookingIntent = lower.includes('appointment') || lower.includes('book') || lower.includes('leni') || lower.includes('lena') || lower.includes('booking') || lower.includes('slot') || lower.includes('time') || lower.includes('waqt')
  const cancelIntent = lower.includes('cancel') || lower.includes('cancel karni') || lower.includes('cancel kar')
  const statusIntent = lower.includes('situation') || lower.includes('status') || lower.includes('kya chal raha') || lower.includes('kaisa hai') || lower.includes('queue') || lower.includes('token')
  const doctorIntent = lower.includes('doctor') || lower.includes('kab ayenge') || lower.includes('kaha hain')

  const doctors = await db.doctor.findMany({ where: { clinicId, active: true } })
  let mentionedDoctor = doctors.find((d) => {
    const dLower = d.name.toLowerCase()
    return lower.includes(dLower) || lower.includes(dLower.split(' ')[1] || '') || lower.includes(dLower.split(' ').slice(0, 2).join(' '))
  })
  if (!mentionedDoctor && doctors.length === 1) mentionedDoctor = doctors[0]

  const services = await db.service.findMany({ where: { clinicId, active: true } })
  let mentionedService = services.find((s) => {
    const sLower = s.name.toLowerCase()
    return lower.includes(sLower)
  })

  const timeMatch = message.match(/\b(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?\b/i)
  const hasTime = timeMatch && !lower.includes('kitne') && !lower.includes('kya time')

  const confirmWords = ['haan', 'yes', 'confirm', 'theek', 'kar do', 'karein', 'ok', 'okay', 'kar doon', 'bana do', 'confirm karein', 'kar dein', 'confirm kar', 'thk', 'thk hai', 'ji haan', 'book kr do', 'kr do', 'appointment kr lo', 'appointment kar lo', 'slot confirm', 'bana dein', 'theek hai', 'achha', 'accha', 'hmm', 'mm']
  const isConfirm = (confirmWords.some((w) => lower.trim() === w || lower.trim().startsWith(w + ' ') || lower.trim().endsWith(' ' + w) || lower.includes(' ' + w + ' ')) && lower.length < 50)
    || /\b(pehla slot|slot de do|slot lo|slot chahiye|first slot)\b/i.test(lower)

  const familyWords = Object.keys(FAMILY_KEYWORDS)
  const familyIntent = familyWords.some(w => new RegExp('\\b' + w + '\\b', 'i').test(lower))
  if (familyIntent && ctx.patientPhone) {
    const familyResult = await executeTool('get_family_member', {}, ctx)
    results.push({ name: 'get_family_member', args: {}, result: familyResult })
  }

  const now = new Date()
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

  const nowMs = now.getTime()
  const pktMs = nowMs + 5 * 60 * 60 * 1000
  const pktDate = new Date(pktMs)
  let targetDateOffset = 0
  if (/\b(kal|tomorrow)\b/i.test(lower)) targetDateOffset = 1
  else if (/\b(parsou?n?|day after)\b/i.test(lower)) targetDateOffset = 2
  else if (/\b(tarseen?|tarsou?n?)\b/i.test(lower)) targetDateOffset = 3
  const targetYear = pktDate.getUTCFullYear()
  const targetMonth = pktDate.getUTCMonth()
  const targetDay = pktDate.getUTCDate() + targetDateOffset
  const targetDate = new Date(Date.UTC(targetYear, targetMonth, targetDay))
  const targetDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`

  if (bookingIntent && mentionedDoctor && !isConfirm) {
    const slotArgs: Record<string, unknown> = { doctorId: mentionedDoctor.id, date: targetDateStr }
    if (mentionedService) slotArgs.serviceId = mentionedService.id
    const result = await executeTool('list_available_slots', slotArgs, ctx)
    results.push({ name: 'list_available_slots', args: slotArgs, result })

    if (hasTime && ctx.patientPhone) {
      let hour = parseInt(timeMatch![1])
      const min = timeMatch![2] ? parseInt(timeMatch![2]) : 0
      const ampm = timeMatch![3]?.toLowerCase()
      if (ampm === 'pm' && hour < 12) hour += 12
      if (ampm === 'am' && hour === 12) hour = 0
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`

      const pktMinutes = hour * 60 + min
      const currentPktMinutes = pktDate.getUTCHours() * 60 + pktDate.getUTCMinutes()
      const isPastSlot = targetDateOffset === 0 && pktMinutes <= currentPktMinutes

      if (!isPastSlot) {
        const slot = await db.slot.findFirst({ where: { doctorId: mentionedDoctor.id, clinicId, date: targetDate, startTime: timeStr, status: 'open' } })
        if (slot) {
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
    }
  } else if (bookingIntent && hasTime && !mentionedDoctor && ctx.patientPhone) {
    let hour = parseInt(timeMatch![1])
    const min = timeMatch![2] ? parseInt(timeMatch![2]) : 0
    const ampm = timeMatch![3]?.toLowerCase()
    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0
    const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`

    const pktMinutes2 = hour * 60 + min
    const currentPktMinutes2 = pktDate.getUTCHours() * 60 + pktDate.getUTCMinutes()
    const isPastSlot2 = targetDateOffset === 0 && pktMinutes2 <= currentPktMinutes2

    if (!isPastSlot2) {
      const foundSlot = await db.slot.findFirst({
        where: { clinicId, date: targetDate, startTime: timeStr, status: 'open' },
        include: { doctor: { select: { id: true, name: true } } },
      })
      if (foundSlot && foundSlot.doctor) {
        const slotArgs: Record<string, unknown> = { doctorId: foundSlot.doctor.id, date: targetDateStr }
        const slotResult = await executeTool('list_available_slots', slotArgs, ctx)
        results.push({ name: 'list_available_slots', args: slotArgs, result: slotResult })
        const freshSlot = await db.slot.findFirst({
          where: { doctorId: foundSlot.doctor.id, clinicId, date: targetDate, startTime: timeStr, status: 'open' },
        })
        if (freshSlot) {
          const nameMatch = message.match(/(?:naam|mera naam|name is|main)\s+([A-Za-z]+)/i)
          const patientName = nameMatch ? nameMatch[1] : (ctx.patientName || 'Patient')
          const bookResult = await executeTool('book_appointment', {
            doctorId: foundSlot.doctor.id,
            slotId: freshSlot.id,
            patientName,
            patientPhone: ctx.patientPhone,
            patientGender: 'unknown',
            paymentMode: 'cash',
          }, ctx)
          results.push({ name: 'book_appointment', args: { doctorId: foundSlot.doctor.id, slotId: freshSlot.id, patientName, patientPhone: ctx.patientPhone }, result: bookResult })
        }
      }
    }
  } else if (isConfirm && ctx.patientPhone) {
    const slotIndexMatch = lower.match(/\b(pehla|pahla|first|1st)\b/) || lower.match(/\b(doosra|dusra|second|2nd)\b/) || lower.match(/\b(teesra|tisra|third|3rd)\b/)
    const slotIndex = slotIndexMatch ? (/\b(pehla|pahla|first|1st)\b/.test(lower) ? 0 : /\b(doosra|dusra|second|2nd)\b/.test(lower) ? 1 : 2) : -1

    let confirmDoctor = mentionedDoctor
    if (!confirmDoctor) {
      const phoneHash = hashPhone(ctx.patientPhone + clinicId)
      const patient = await db.patient.findUnique({
        where: { clinicId_phoneHash: { clinicId, phoneHash } },
        select: { id: true },
      })
      if (patient) {
        const lastAppt = await db.appointment.findFirst({
          where: { patientId: patient.id },
          orderBy: { createdAt: 'desc' },
          include: { doctor: { select: { id: true, name: true } } },
        })
        if (lastAppt?.doctor) confirmDoctor = lastAppt.doctor as any
      }
      if (!confirmDoctor) {
        const docWithSlots = await db.doctor.findFirst({
          where: { clinicId, active: true },
          include: { slots: { where: { date: targetDate, status: 'open' }, take: 1 } },
        })
        if (docWithSlots?.slots?.length) confirmDoctor = docWithSlots
        else if (doctors.length > 0) confirmDoctor = doctors[0]
      }
    }
    if (!confirmDoctor) return results

    const slotArgs: Record<string, unknown> = { doctorId: confirmDoctor.id, date: targetDateStr }
    if (mentionedService) slotArgs.serviceId = mentionedService.id
    const slotResult = await executeTool('list_available_slots', slotArgs, ctx)
    results.push({ name: 'list_available_slots', args: slotArgs, result: slotResult })

    const parsed = JSON.parse(slotResult)
    if (parsed.slots && parsed.slots.length > 0) {
      const idx = slotIndex >= 0 && slotIndex < parsed.slots.length ? slotIndex : 0
      const targetSlot = parsed.slots[idx]
      const bookResult = await executeTool('book_appointment', {
        doctorId: confirmDoctor.id,
        slotId: targetSlot.id,
        patientName: ctx.patientName || 'Patient',
        patientPhone: ctx.patientPhone,
        patientGender: 'unknown',
        paymentMode: 'cash',
      }, ctx)
      results.push({ name: 'book_appointment', args: { doctorId: confirmDoctor.id, slotId: targetSlot.id }, result: bookResult })
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
      for (const d of doctors.slice(0, 3)) {
        const result = await executeTool('get_doctor_status', { doctorId: d.id }, ctx)
        results.push({ name: 'get_doctor_status', args: { doctorId: d.id }, result })
      }
    }
  }

  return results
}
