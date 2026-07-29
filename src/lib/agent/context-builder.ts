import { db } from '../db'
import { hashPhone } from '../auth'
import type { AgentContext } from './types'
import { getPatientMemory, buildMemoryBlock } from './learned-memory'

export async function buildPatientContext(ctx: AgentContext): Promise<{ context: string; patientName?: string }> {
  let context = ''
  let patientName: string | undefined

  if (!ctx.patientPhone) return { context, patientName }

  const phoneHash = hashPhone(ctx.patientPhone + ctx.clinicId)
  const patient = await db.patient.findUnique({
    where: { clinicId_phoneHash: { clinicId: ctx.clinicId, phoneHash } },
    include: {
      familyMembers: true,
      appointments: {
        take: 5,
        orderBy: { start: 'desc' },
        include: { doctor: true },
      },
    },
  })

  if (!patient) return { context, patientName }

  patientName = patient.name || undefined
  context = `\n\nPATIENT CONTEXT:\nName: ${patient.name || 'Unknown'}\nGender: ${patient.gender}\nPhone: ${patient.phone}\nNo-show count: ${patient.noShowCount}\nTotal visits: ${patient.totalVisits}`

  // ── LEARNED MEMORY (cost-optimized: 1 cheap read, 1-2 lines injected) ──
  // This is what makes the agent feel like it "knows" the patient across
  // conversations without re-reading raw history or calling the LLM again.
  try {
    const mem = await getPatientMemory(ctx.clinicId, patient.id)
    const memBlock = buildMemoryBlock(mem)
    if (memBlock) context += memBlock
  } catch (err) {
    console.error('[agent] failed to load learned memory:', err)
  }

  if (patient.familyMembers.length > 0) {
    context += `\n\nREGISTERED FAMILY MEMBERS (use these names when booking for them):`
    for (const fm of patient.familyMembers) {
      const relationLabel: Record<string, string> = { spouse: 'Spouse', child: 'Child', parent: 'Parent', sibling: 'Sibling', other: 'Other' }
      context += `\n- ${fm.name} (${relationLabel[fm.relation] || fm.relation}, ${fm.gender})`
    }
    context += `\n\nWhen the patient asks to book for a family member, FIRST check this list. If the person is here, use their name and relation directly.`
  }

  if (patient.appointments.length > 0) {
    const upcomingAppts = patient.appointments.filter(a => a.status === 'booked' && a.start > new Date())
    if (upcomingAppts.length > 0) {
      context += `\n\nUPCOMING APPOINTMENTS:`
      for (const a of upcomingAppts) {
        const dateStr = a.start.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        const timeStr = a.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
        context += `\n- ID: "${a.id}" | ${dateStr} ${timeStr} - Dr. ${a.doctor.name} - Status: ${a.status}`
      }
      context += `\n\nWhen the patient asks about their appointments or wants to cancel/reschedule, use the appointment IDs shown above.`
    }
    const pastAppts = patient.appointments.filter(a => a.start < new Date())
    if (pastAppts.length > 0) {
      context += `\n\nPAST APPOINTMENTS:`
      for (const a of pastAppts.slice(0, 3)) {
        const dateStr = a.start.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        context += `\n- ${dateStr} - Dr. ${a.doctor.name} - ${a.status}`
      }
    }
  }

  if (ctx.conversationId) {
    try {
      const conv = await db.conversation.findUnique({
        where: { id: ctx.conversationId },
        select: { summary: true },
      })
      if (conv?.summary) {
        context += `\n\nCONVERSATION HISTORY: ${conv.summary}`
      }
    } catch (err) {
      console.error('[agent] Failed to load conversation summary:', err)
    }
  }

  return { context, patientName }
}
