import { createChatCompletion } from './chat'
import type { AgentMessage } from './types'

export async function summarizeOldTurns(
  history: AgentMessage[],
  clinicId: string
): Promise<{ summary: string; updatedHistory: AgentMessage[] }> {
  const oldestTurns = history.slice(0, 10)
  const remainingTurns = history.slice(10)

  const summaryPrompt = `Summarize the following conversation between a clinic AI receptionist and a patient. Focus on:
- Patient name and contact info
- Preferred language
- Any appointments booked, cancelled, or rescheduled
- Any family members mentioned
- Any ongoing issues or requests

Keep the summary brief (2-3 sentences) in the same language mix as the conversation.

CONVERSATION TO SUMMARIZE:
${oldestTurns.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}`

  try {
    const summaryCompletion = await createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a conversation summarizer. Extract key information concisely.' },
        { role: 'user', content: summaryPrompt },
      ] as never,
      temperature: 0.3,
      max_tokens: 200,
    })
    const summary = summaryCompletion.choices[0]?.message?.content || 'Summary unavailable'

    const updatedHistory: AgentMessage[] = [
      { role: 'system', content: `[CONVERSATION SUMMARY of earlier turns]: ${summary}` },
      ...remainingTurns,
    ]

    return { summary, updatedHistory }
  } catch (err) {
    console.error('[agent] Summarization failed:', err)
    return {
      summary: 'Summarization failed — keeping full history',
      updatedHistory: history,
    }
  }
}
