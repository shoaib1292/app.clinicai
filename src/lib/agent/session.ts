import { store } from '../store'
import type { AgentSessionState, AgentName } from './types'

const SESSION_AGENT_KEY = (clinicId: string, phoneOrAnon: string) =>
  `agent:session:${clinicId}:${phoneOrAnon}:agent_state`

const SESSION_AGENT_TTL = 7 * 24 * 60 * 60

export async function getSessionAgent(
  clinicId: string,
  phoneOrAnon: string,
): Promise<AgentSessionState | null> {
  return store.get<AgentSessionState>(SESSION_AGENT_KEY(clinicId, phoneOrAnon))
}

export async function setSessionAgent(
  clinicId: string,
  phoneOrAnon: string,
  state: AgentSessionState,
): Promise<void> {
  await store.set(SESSION_AGENT_KEY(clinicId, phoneOrAnon), state, SESSION_AGENT_TTL)
}

export function createSessionState(agent: AgentName): AgentSessionState {
  return {
    currentAgent: agent,
    agentStack: [],
    handoffCount: 0,
  }
}
