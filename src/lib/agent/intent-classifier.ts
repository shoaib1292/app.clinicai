import type { AgentName, IntentClassification } from './types'
import { AGENT_NAMES, getAgentConfig } from './registry'
import { createChatCompletion } from './chat'

export async function classifyIntent(
  message: string,
  currentAgent: AgentName | null,
): Promise<IntentClassification> {
  const lower = message.toLowerCase().trim()

  const scores: Array<{ agent: AgentName; score: number; matches: string[] }> = []

  for (const name of AGENT_NAMES) {
    const config = getAgentConfig(name)
    const matches = config.capabilityKeywords.filter(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp('\\b' + escaped + '\\b', 'i')
      return pattern.test(lower)
    })
    if (matches.length > 0) {
      scores.push({ agent: name, score: matches.length, matches })
    }
  }

  scores.sort((a, b) => b.score - a.score)

  if (scores.length > 0) {
    const top = scores[0]
    const second = scores[1]

    if (!second || top.score >= second.score * 2) {
      return {
        agentName: top.agent,
        confidence: 'high',
        method: 'keyword',
        reason: `Matched keywords: ${top.matches.slice(0, 5).join(', ')}`,
      }
    }

    if (top.score === second.score && currentAgent) {
      if (top.agent === currentAgent || second.agent === currentAgent) {
        return {
          agentName: currentAgent,
          confidence: 'medium',
          method: 'keyword',
          reason: 'Ambiguous; staying with current agent',
        }
      }
    }

    return {
      agentName: top.agent,
      confidence: 'medium',
      method: 'keyword',
      reason: `Matched keywords: ${top.matches.slice(0, 5).join(', ')}`,
    }
  }

  return classifyViaLLM(message, currentAgent)
}

async function classifyViaLLM(
  message: string,
  currentAgent: AgentName | null,
): Promise<IntentClassification> {
  try {
    const agentList = AGENT_NAMES.map(name => {
      const config = getAgentConfig(name)
      return `- ${name}: ${config.description}`
    }).join('\n')

    const currentHint = currentAgent
      ? `\nThe current active agent is "${currentAgent}". Prefer staying with it unless the message clearly needs a different agent.`
      : ''

    const completion = await createChatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for a medical clinic's AI assistant system. Classify the patient's message into one of these agents:\n\n${agentList}\n\nReply with ONLY the agent name (one word): receptionist, billing, info, followup, or triage. Default: receptionist.${currentHint}`,
        },
        { role: 'user', content: message },
      ] as never,
      temperature: 0.1,
      max_tokens: 10,
    })

    const raw = (completion.choices[0]?.message as { content?: string })?.content?.trim().toLowerCase()
    const valid = AGENT_NAMES as string[]
    const agentName: AgentName = valid.includes(raw || '') ? (raw as AgentName) : (currentAgent || 'receptionist')

    return {
      agentName,
      confidence: 'low',
      method: 'llm',
      reason: `LLM classified as: ${raw || 'fallback'}`,
    }
  } catch {
    return {
      agentName: currentAgent || 'receptionist',
      confidence: 'low',
      method: 'llm',
      reason: 'LLM classification failed; defaulting',
    }
  }
}
