import type { AgentConfig, AgentName } from './types'
import { buildReceptionistPrompt } from './prompts/receptionist'
import { buildBillingPrompt } from './prompts/billing'
import { buildInfoPrompt } from './prompts/info'
import { buildTriagePrompt } from './prompts/triage'
import { buildFollowUpPrompt } from './prompts/followup'
import { receptionistProactive } from './proactive/receptionist'
import { billingProactive } from './proactive/billing'
import { triageProactive } from './proactive/triage'
import { getToolsForAgent } from './tool-sets'

const CAPABILITY_KEYWORDS: Record<AgentName, string[]> = {
  receptionist: [
    'appointment', 'book', 'booking', 'lena', 'leni', 'slot', 'time', 'waqt',
    'mulaqat', 'doctor ke pas', 'doctor se', 'dekhna', 'dikhana',
    'cancel', 'cancel karni', 'cancel kar', 'reschedule', 'badal', 'tabdeel', 'change',
    'situation', 'status', 'kya chal raha', 'queue', 'token', 'number',
    'kitna time', 'wait', 'intezar', 'pohanch', 'pahunch',
    'doctor', 'kab ayenge', 'kaha hain', 'available', 'maujood',
    'family', 'biwi', 'bache', 'ammi', 'abbu', 'husband', 'wife', 'son',
    'daughter', 'bhai', 'behen', 'ghar wale', 'ghar mein',
  ],
  billing: [
    'fee', 'fees', 'paisa', 'paise', 'rupiya', 'rupaye', 'kitna', 'kitne',
    'kitni', 'charges', 'charge', 'price', 'cost', 'qeemat', 'payment',
    'pay', 'ada', 'ada karna', 'bank', 'account', 'transfer', 'jazzcash',
    'easypaisa', 'online', 'cash', 'screenshot', 'proof', 'receipt',
    'bill', 'invoice', 'refund',
  ],
  info: [
    'timing', 'time', 'khula', 'band', 'open', 'close', 'hours', 'kab tak',
    'kab se', 'subah', 'sham', 'address', 'pata', 'location', 'kahan',
    'service', 'services', 'suvidha', 'facility', 'facilities',
    'speciality', 'specialist', 'info', 'information', 'maloomat',
    'details', 'detail', 'about', 'batao', 'batayein', 'pooch', 'poochna',
  ],
  followup: [
    'followup', 'follow up', 'feedback', 'review', 'experience', 'tajurba',
    'kaisa laga', 'kaisi rahi', 'rating', 'star', 'stars',
    'phir se', 'dobara', 'wapis', 'again',
  ],
  triage: [
    'emergency', 'urgent', 'bleeding', 'blood', 'accident', 'pain', 'dard',
    'severe', 'critical', 'hospital', 'ambulance', 'bachao', 'madad',
    'symptoms', 'bimari', 'bimar', 'takleef', 'sans', 'breathing',
    'chest', 'heart', 'attack', 'stroke', 'fever', 'bukhar', 'ulti',
    'dast', 'chot', 'gir', 'fell', 'gira', 'toot', 'fracture', 'help',
  ],
}

const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  receptionist: 'Handles appointment booking, cancellation, rescheduling, queue status, doctor status, and family member management',
  billing: 'Handles fee inquiries, payment confirmation, bank details, and pricing questions',
  info: 'Handles general FAQs: clinic hours, doctor schedules, services catalog, location',
  followup: 'Handles post-appointment follow-ups, feedback collection, and dormant patient reactivation',
  triage: 'Handles emergency detection, symptom-related queries, and urgent escalation to human staff',
}

const AGENT_TOOL_NAMES: Record<AgentName, string[]> = {
  receptionist: [
    'list_available_slots', 'book_appointment', 'cancel_appointment',
    'reschedule_appointment', 'get_live_queue_status', 'get_doctor_status',
    'get_family_member', 'add_family_member', 'get_patient_history',
    'set_reminder_preference',
  ],
  billing: [
    'get_clinic_info', 'attach_payment_proof', 'get_patient_history',
  ],
  info: [
    'get_clinic_info', 'get_doctor_status',
  ],
  followup: [
    'get_patient_history',
  ],
  triage: [
    'transfer_to_human', 'get_clinic_info',
  ],
}

export const AGENT_NAMES: AgentName[] = ['receptionist', 'billing', 'info', 'followup', 'triage']

export function getAgentConfig(name: AgentName): AgentConfig {
  const baseConfig: Omit<AgentConfig, 'buildSystemPrompt' | 'proactiveDetect' | 'beforeLLM' | 'afterTools' | 'buildFallback'> = {
    name,
    description: AGENT_DESCRIPTIONS[name],
    capabilityKeywords: CAPABILITY_KEYWORDS[name],
    toolNames: AGENT_TOOL_NAMES[name],
  }

  switch (name) {
    case 'receptionist':
      return {
        ...baseConfig,
        buildSystemPrompt: buildReceptionistPrompt,
        temperature: 0.4,
        maxTokens: 500,
        proactiveDetect: receptionistProactive,
      }
    case 'billing':
      return {
        ...baseConfig,
        buildSystemPrompt: buildBillingPrompt,
        temperature: 0.3,
        maxTokens: 400,
        proactiveDetect: billingProactive,
      }
    case 'info':
      return {
        ...baseConfig,
        buildSystemPrompt: buildInfoPrompt,
        temperature: 0.3,
        maxTokens: 350,
      }
    case 'followup':
      return {
        ...baseConfig,
        buildSystemPrompt: buildFollowUpPrompt,
        temperature: 0.5,
        maxTokens: 300,
      }
    case 'triage':
      return {
        ...baseConfig,
        buildSystemPrompt: buildTriagePrompt,
        temperature: 0.3,
        maxTokens: 300,
        beforeLLM: triageBeforeLLM,
        proactiveDetect: triageProactive,
      }
  }
}

export function getToolsForAgentByName(name: AgentName) {
  return getToolsForAgent(AGENT_TOOL_NAMES[name])
}

async function triageBeforeLLM(message: string, _ctx: import('./types').AgentContext): Promise<string | null> {
  const emergencyPatterns = [
    /bleeding|blood|accident|heart attack|stroke|not breathing|sans nahi|sans band/i,
    /emergency|ambulance|bachao|madad karo|urgent help/i,
  ]
  if (emergencyPatterns.some(p => p.test(message))) {
    return '\uD83D\uDEA8 Agar yeh emergency hai, turant 1122 ya nearest hospital jayein. Yeh AI assistant hai \u2014 main emergency handle nahi kar sakta/sakti.\n\nMain clinic staff ko alert kar rahi/raha hoon. Kya aap chahte hain ke main aap ko human receptionist se connect karoon?'
  }
  return null
}
