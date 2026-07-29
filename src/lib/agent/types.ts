export interface AgentContext {
  clinicId: string
  patientPhone?: string
  patientName?: string
  conversationId?: string
  testMode?: boolean
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
}

export const SESSION_TTL = 7 * 24 * 60 * 60 // 7 days
export const HISTORY_WINDOW = 30 // turns

// ── Multi-Agent Types ──────────────────────────────────────────────

export type AgentName = 'receptionist' | 'billing' | 'info' | 'followup' | 'triage'

export interface AgentConfig {
  name: AgentName
  description: string
  capabilityKeywords: string[]
  toolNames: string[]
  buildSystemPrompt: (clinicId: string, ctx: AgentContext) => Promise<string>
  model?: string
  temperature?: number
  maxTokens?: number
  beforeLLM?: (message: string, ctx: AgentContext) => Promise<string | null>
  proactiveDetect?: (message: string, ctx: AgentContext) => Promise<ProactiveResult[]>
  afterTools?: (messages: AgentMessage[], toolCallLog: ToolCallLogEntry[], ctx: AgentContext) => Promise<void>
  buildFallback?: (message: string, ctx: AgentContext) => Promise<string>
}

export interface IntentClassification {
  agentName: AgentName
  confidence: 'high' | 'medium' | 'low'
  method: 'keyword' | 'llm'
  reason: string
}

export interface HandoffContext {
  fromAgent: AgentName
  toAgent: AgentName
  reason: string
  summary: string
  timestamp: number
}

export interface AgentSessionState {
  currentAgent: AgentName
  agentStack: Array<{ agent: AgentName; turnCount: number }>
  handoffCount: number
  lastHandoff?: HandoffContext
}

export interface ProactiveResult {
  name: string
  args: Record<string, unknown>
  result: string
}

export type ToolCallLogEntry = {
  name: string
  args: Record<string, unknown>
  result: unknown
}

export const FAMILY_KEYWORDS: Record<string, string> = {
  'ammi': 'parent', 'ami': 'parent', 'amma': 'parent', 'maa': 'parent', 'ma': 'parent',
  'mother': 'parent', 'mom': 'parent',
  'abbu': 'parent', 'abu': 'parent', 'abba': 'parent', 'papa': 'parent', 'walid': 'parent',
  'father': 'parent', 'dad': 'parent',
  'biwi': 'spouse', 'begum': 'spouse', 'wife': 'spouse',
  'shohar': 'spouse', 'mian': 'spouse', 'husband': 'spouse',
  'bhai': 'sibling', 'bhaiya': 'sibling', 'brother': 'sibling',
  'behen': 'sibling', 'baji': 'sibling', 'apa': 'sibling', 'sister': 'sibling',
  'beta': 'child', 'baita': 'child', 'son': 'child',
  'beti': 'child', 'daughter': 'child',
  'bache': 'child', 'bacha': 'child', 'bachi': 'child', 'child': 'child', 'children': 'child',
}
