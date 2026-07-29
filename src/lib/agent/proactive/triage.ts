import { executeTool } from '../execute-tool'
import type { AgentContext, ProactiveResult } from '../types'

const HIGH_EMERGENCY = /bleeding|blood loss|heart attack|stroke|not breathing|sans nahi|sans band|unconscious|behosh|severe accident|head injury|sir mein chot|fracture|seizure|burn|ambulance|bachao|madad karo|urgent help/i

export async function triageProactive(
  message: string,
  ctx: AgentContext,
): Promise<ProactiveResult[]> {
  const lower = message.toLowerCase()
  const results: ProactiveResult[] = []

  if (HIGH_EMERGENCY.test(lower)) {
    const result = await executeTool('transfer_to_human', {
      reason: 'Emergency keyword detected: ' + lower.slice(0, 100),
    }, ctx)
    results.push({ name: 'transfer_to_human', args: { reason: 'emergency' }, result })
  }

  return results
}
