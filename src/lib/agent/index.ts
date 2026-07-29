import { db } from '../db'
import { runOrchestrator } from './orchestrator'
import { runAgentSingle } from './run-agent-single'
import type { AgentContext, AgentMessage } from './types'

export type { AgentContext, AgentMessage }

export { runOrchestrator, runAgentSingle }

export async function runAgent(opts: {
  clinicId: string
  patientPhone?: string
  patientName?: string
  conversationId?: string
  userMessage: string
  modality?: 'text' | 'voice'
  voiceAudioBase64?: string
  voiceMimeType?: string
}): Promise<{
  reply: string
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }>
  error?: string
  modality: 'text' | 'voice'
  voiceReplyBase64?: string
  voiceReplyFormat?: string
  transcript?: string
}> {
  const clinic = await db.clinic.findUnique({ where: { id: opts.clinicId } })
  if (clinic && (clinic as Record<string, unknown>).agentMode === 'multi') {
    return runOrchestrator(opts)
  }
  return runAgentSingle(opts)
}
