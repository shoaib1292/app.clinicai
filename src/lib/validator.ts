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
export type DbVerifier = (appointmentId: string) => Promise<{ exists: boolean; totalFee?: number; status?: string }>

export async function validateAgentResponse(response: string, toolResults: ToolResult[], verifyDb?: DbVerifier): Promise<ValidationResult> {
  const issues: string[] = []
  const lower = response.toLowerCase()

  // 1. Check for medical advice (should be refused)
  const medicalAdvicePatterns = [
    /(?:take|eat|drink|use)\s+(?:this|these)\s+(?:medicine|tablet|capsule|syrup)/i,
    /(?:you should|aap ko|aap chahiye)\s+(?:take|khaa|pee|use)\s+/i,
    /(?:diagnosis|bimari|marz)\s+(?:is|hai)\s+/i,
    /(?:prescription|dawa|dawai|medicine)\s+(?:for|ke liye|leni|lena)\s*/i,
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
          if (fees.total && Math.abs(mentionedFee - fees.total) > 1) {
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
      const result = tr.result as { name?: string; doctors?: Array<{ name?: string }> }
      const knownNames = new Set<string>()
      if (result.name) knownNames.add(result.name.toLowerCase().replace(/^dr\.?\s*/i, ''))
      for (const d of result.doctors || []) {
        if (d.name) knownNames.add(d.name.toLowerCase().replace(/^dr\.?\s*/i, ''))
      }
      if (knownNames.size > 0) {
        // Extract doctor mentions like "Dr. Ali", "Doctor Sana", "Dr Sana"
        const doctorMentions = response.match(/\bdr\.?\s+([A-Za-z]+)/gi) || []
        for (const mention of doctorMentions) {
          const name = mention.replace(/^dr\.?\s+/i, '').toLowerCase()
          if (!knownNames.has(name)) {
            issues.push(`Agent mentioned doctor "${mention.trim()}" which is not in the known doctor list`)
            return {
              valid: false,
              issues,
              shouldRegenerate: true,
              stricterPrompt: 'STRICT: Only mention doctors whose names appear in the tool results. Do NOT invent doctor names.',
            }
          }
        }
      }
    }
  }

  // 6. Verify claimed booking/cancel against the database when a verifier is provided
  if (verifyDb) {
    const hasBookingClaim = /\b(book|booking|confirm|appointment)\b/i.test(response)
    const hasCancelClaim = /\b(cancel|cancelled|munsakh)\b/i.test(response)

    const bookingTool = toolResults.find((t) => t.name === 'book_appointment')
    const cancelTool = toolResults.find((t) => t.name === 'cancel_appointment')

    if ((hasCancelClaim && cancelTool) || (hasBookingClaim && bookingTool)) {
      const appt = (cancelTool?.result ?? bookingTool?.result) as { appointment?: { id?: string; fees?: { total?: number } } }
      const apptId = appt?.appointment?.id
      if (apptId) {
        const dbResult = await verifyDb(apptId)

        if (cancelTool && dbResult.exists && dbResult.status !== 'cancelled') {
          issues.push('Agent claimed cancellation but the appointment is not cancelled in the database')
          return {
            valid: false,
            issues,
            shouldRegenerate: true,
            stricterPrompt: 'STRICT: Do not claim an appointment was cancelled unless the cancellation was confirmed. Verify the actual status before telling the patient it was cancelled.',
          }
        }

        if (bookingTool && dbResult.exists && dbResult.totalFee !== undefined && appt?.appointment?.fees?.total !== undefined) {
          if (Math.abs(dbResult.totalFee - appt.appointment.fees.total) > 10) {
            issues.push(`DB fee ${dbResult.totalFee} differs from quoted fee ${appt.appointment.fees.total}`)
            return {
              valid: false,
              issues,
              shouldRegenerate: true,
              stricterPrompt: `STRICT: The actual fee is PKR ${dbResult.totalFee}. Do NOT quote PKR ${appt.appointment.fees.total}.`,
            }
          }
        }
      }
    }
  }

  // 7. Check response is not empty or just tool-call artifacts
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
