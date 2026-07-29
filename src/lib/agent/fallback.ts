import { db } from '../db'
import type { AgentContext } from './types'

export async function ruleBasedFallback(message: string, ctx: AgentContext): Promise<string> {
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
  return clinic.agentFallback || 'Our AI agent is currently offline. Please call the clinic directly or wait for our staff to respond.'
}
