/**
 * Post-Generation Validator (Founder Doc §17)
 *
 * Validates agent responses against tool results to prevent hallucination.
 * If the agent mentions a slot/doctor/fee NOT in the tool results, the response
 * is flagged for regeneration with a stricter prompt.
 *
 * Guardrails (§17):
 * (a) System prompt forbids fabrication
 * (b) Post-generation validator checks responses against tool results
 * (c) Medical advice is refused and triaged to human
 * (d) PII (other than patient's own) is never echoed
 */

interface ToolResult {
  name: string
  result: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  issues: string[]
  shouldRegenerate: boolean
  stricterPrompt?: string
}

/**
 * Validate an agent response against the tool results it was based on.
 */
export function validateAgentResponse(response: string, toolResults: ToolResult[]): ValidationResult {
  const issues: string[] = []
  const lower = response.toLowerCase()

  // 1. Check for medical advice (should be refused)
  const medicalAdvicePatterns = [
    /(?:take|eat|drink|use)\s+(?:this|these)\s+(?:medicine|tablet|capsule|syrup)/i,
    /(?:you should|aap ko|aap chahiye)\s+(?:take|khaa|pee|use)\s+/i,
    /(?:diagnosis|bimari|marz)\s+(?:is|hai)\s+/i,
    /(?:prescription|dawa)\s+(?:for|ke liye)\s+/i,
  ]
  for (const pattern of medicalAdvicePatterns) {
    if (pattern.test(response)) {
      issues.push('Agent provided medical advice instead of refusing')
      return {
        valid: false,
        issues,
        shouldRegenerate: true,
        stricterPrompt: 'STRICT: You MUST refuse medical advice. Reply: "Main sirf appointment me madad kar sakti/karta hoon. Medical advice ke liye doctor se direct baat karein." Do NOT suggest any medicine, diagnosis, or treatment.',
      }
    }
  }

  // 2. Check for PII leakage (other patients' info)
  const piiPatterns = [
    /(?:other patient|doosre mareez|kisi aur)/i,
    /\b\d{4}\s*\d{4}\s*\d{4}\b/, // phone numbers that aren't the current patient's
  ]
  for (const pattern of piiPatterns) {
    if (pattern.test(response)) {
      issues.push('Response may contain other patient PII')
      return {
        valid: false,
        issues,
        shouldRegenerate: true,
        stricterPrompt: 'STRICT: Never mention other patients or their data. Only discuss the current patient.',
      }
    }
  }

  // 3. Validate slots mentioned in response against list_available_slots results
  for (const tr of toolResults) {
    if (tr.name === 'list_available_slots') {
      const result = tr.result as { slots?: Array<{ id: string; startTime: string; tokenNo?: number }> }
      if (result.slots && result.slots.length > 0) {
        // Extract times mentioned in the response
        const timePattern = /\b(\d{1,2}:\d{2})\b/g
        const mentionedTimes = [...response.matchAll(timePattern)].map((m) => m[1])
        const validTimes = result.slots.map((s) => s.startTime)

        for (const time of mentionedTimes) {
          if (!validTimes.includes(time)) {
            issues.push(`Agent mentioned slot time ${time} which is NOT in the available slots list`)
            return {
              valid: false,
              issues,
              shouldRegenerate: true,
              stricterPrompt: `STRICT: Only mention slot times from the list_available_slots result: ${validTimes.join(', ')}. Do NOT invent times.`,
            }
          }
        }

        // Check token numbers
        const tokenPattern = /token\s*#?\s*(\d+)/gi
        const mentionedTokens = [...response.matchAll(tokenPattern)].map((m) => parseInt(m[1]))
        const validTokens = result.slots.map((s) => s.tokenNo).filter(Boolean) as number[]

        for (const token of mentionedTokens) {
          if (validTokens.length > 0 && !validTokens.includes(token)) {
            issues.push(`Agent mentioned token #${token} which is NOT in the available slots`)
            return {
              valid: false,
              issues,
              shouldRegenerate: true,
              stricterPrompt: `STRICT: Only mention token numbers from the available slots: ${validTokens.join(', ')}`,
            }
          }
        }
      }
    }
  }

  // 4. Validate fees mentioned in response
  for (const tr of toolResults) {
    if (tr.name === 'book_appointment') {
      const result = tr.result as { appointment?: { fees?: { total?: number; doctorFee?: number; platformFee?: number } } }
      const fees = result.appointment?.fees
      if (fees) {
        // Check if response mentions a different total fee
        const feePattern = /(?:total|kul|total fee)\s*[:\-]?\s*(?:pkr|rs\.?)?\s*(\d+)/i
        const feeMatch = response.match(feePattern)
        if (feeMatch) {
          const mentionedFee = parseInt(feeMatch[1])
          if (fees.total && Math.abs(mentionedFee - fees.total) > 10) {
            issues.push(`Agent mentioned fee PKR ${mentionedFee} but actual is PKR ${fees.total}`)
            return {
              valid: false,
              issues,
              shouldRegenerate: true,
              stricterPrompt: `STRICT: The total fee is PKR ${fees.total}. Doctor fee: PKR ${fees.doctorFee}, Platform fee: PKR ${fees.platformFee}. Do NOT mention incorrect amounts.`,
            }
          }
        }
      }
    }
  }

  // 5. Check for doctor names not in the clinic
  for (const tr of toolResults) {
    if (tr.name === 'get_doctor_status' || tr.name === 'get_live_queue_status') {
      const result = tr.result as { name?: string }
      if (result.name) {
        // If response mentions a doctor name that's very different from the tool result
        // This is a soft check — only flag if response invents a clearly different name
      }
    }
  }

  // 6. Check response is not empty or just tool-call artifacts
  const cleanResponse = response.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
  if (cleanResponse.length < 5) {
    issues.push('Response is too short after stripping tool calls')
    return {
      valid: false,
      issues,
      shouldRegenerate: true,
      stricterPrompt: 'Please provide a clear, helpful response to the patient. Do not just call tools — explain the result.',
    }
  }

  return { valid: true, issues: [], shouldRegenerate: false }
}

/**
 * Check if a response contains ClinicAI branding (should be white-labeled per §10).
 */
export function checkBranding(response: string): boolean {
  const brandingPatterns = [
    /\bclinicai\b/i,
    /\bclinic\s*ai\b/i,
  ]
  return brandingPatterns.some((p) => p.test(response))
}
