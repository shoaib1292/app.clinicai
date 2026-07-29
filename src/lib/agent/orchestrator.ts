import { db } from '../db'
import { store } from '../store'
import { detectLanguage, replyLanguage, getVoiceForGender } from '../voice'
import { ensureLlmConfig } from './llm-config'
import { createChatCompletion } from './chat'
import { executeTool } from './execute-tool'
import { parseTextToolCalls } from './parse-text-calls'
import { summarizeOldTurns } from './summarizer'
import { buildPatientContext } from './context-builder'
import { classifyIntent } from './intent-classifier'
import { getAgentConfig, getToolsForAgentByName } from './registry'
import { getSessionAgent, setSessionAgent, createSessionState } from './session'
import { sanitizeUserMessage, executeToolGuarded } from './guard'
import { SESSION_TTL, HISTORY_WINDOW } from './types'
import type { AgentContext, AgentMessage, AgentName, AgentConfig, HandoffContext, ProactiveResult } from './types'

export async function runOrchestrator(opts: {
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
  const ctx: AgentContext = {
    clinicId: opts.clinicId,
    patientPhone: opts.patientPhone,
    patientName: opts.patientName,
    conversationId: opts.conversationId,
    testMode: process.env.AGENT_TEST_MODE !== 'false',
  }

  const clinic = await db.clinic.findUnique({ where: { id: opts.clinicId } })
  if (!clinic) return { reply: 'Clinic not found', toolCalls: [], modality: 'text' }
  if (!clinic.agentEnabled) {
    return { reply: `${clinic.agentName} is currently paused. Please call the clinic directly.`, toolCalls: [], modality: 'text' }
  }

  await ensureLlmConfig()

  const ttsVoice = getVoiceForGender(clinic.agentGender)

  let inputModality: 'text' | 'voice' = opts.modality || 'text'
  let actualMessage = opts.userMessage
  let transcript: string | undefined

  if (opts.voiceAudioBase64) {
    inputModality = 'voice'
    const { transcribeAudio } = await import('../voice')
    const sttResult = await transcribeAudio(opts.voiceAudioBase64, opts.voiceMimeType)
    if (sttResult.text) {
      actualMessage = sttResult.text
      transcript = sttResult.text
    } else {
      const errorReply = 'Maaf karen, aap ki awaz samajh nahi aai — ho sakta hai aap ne koi aisi language boli jo abhi support nahi hai. Urdu me dobara bolein ya text message karein. Shukriya!'
      const { synthesizeSpeech } = await import('../voice')
      const ttsResult = await synthesizeSpeech(errorReply, { voice: ttsVoice })
      return {
        reply: errorReply, toolCalls: [], modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        voiceReplyFormat: ttsResult.format, transcript: undefined, error: sttResult.error,
      }
    }
  }

  // Treat the inbound patient text strictly as data. Strip obvious
  // instruction-injection patterns so they cannot masquerade as commands.
  actualMessage = sanitizeUserMessage(actualMessage)

  const sessionKey = `agent:session:${opts.clinicId}:${opts.patientPhone || 'anon'}`
  let history: AgentMessage[] = (await store.get<AgentMessage[]>(sessionKey)) || []

  const phoneOrAnon = opts.patientPhone || 'anon'
  let sessionState = await getSessionAgent(opts.clinicId, phoneOrAnon)
  const previousAgent = sessionState?.currentAgent || null

  const intent = await classifyIntent(actualMessage, previousAgent)
  const agentName = intent.agentName
  const agentConfig = getAgentConfig(agentName)

  let handoffContext: string | null = null
  if (sessionState && sessionState.currentAgent !== agentName) {
    const handoff: HandoffContext = {
      fromAgent: sessionState.currentAgent,
      toAgent: agentName,
      reason: intent.reason,
      summary: `Handoff: Patient was talking to ${sessionState.currentAgent}. Last interaction: "${actualMessage.slice(0, 120)}"`,
      timestamp: Date.now(),
    }
    sessionState.agentStack.push({ agent: sessionState.currentAgent, turnCount: sessionState.agentStack.length + 1 })
    sessionState.handoffCount++
    sessionState.lastHandoff = handoff
    sessionState.currentAgent = agentName

    handoffContext = `[AGENT HANDOFF: Switched from ${handoff.fromAgent} to ${handoff.toAgent}]\nReason: ${handoff.reason}\nContext summary: ${handoff.summary}`
  } else if (!sessionState) {
    sessionState = createSessionState(agentName)
  }
  await setSessionAgent(opts.clinicId, phoneOrAnon, sessionState)

  const systemPrompt = await agentConfig.buildSystemPrompt(opts.clinicId, ctx)
  const { context: patientContext, patientName } = await buildPatientContext(ctx)
  if (patientName) ctx.patientName = patientName

  // ── SELF-LEARNING (cheap read, no LLM): inject today's clinic-level learning
  // so the agent adapts phrasing / cadence to what actually worked. ──
  let clinicLearningBlock = ''
  try {
    const { getClinicLearning } = await import('./learned-memory')
    const today = new Date().toISOString().slice(0, 10)
    const learning = await getClinicLearning(opts.clinicId, today)
    if (learning) clinicLearningBlock = `\n\nTODAY'S CLINIC LEARNING (adapt your approach based on this): ${learning}`
  } catch (err) {
    console.error('[orchestrator] failed to load clinic learning:', err)
  }

  const detectedLang = detectLanguage(actualMessage)
  const replyLang = replyLanguage(detectedLang)
  let langInstruction: string
  if (replyLang === 'urdu') {
    const modalityHint = inputModality === 'voice'
      ? 'Use ROMAN URDU (English script, Urdu words) for correct audio pronunciation.'
      : 'Reply in URDU SCRIPT (اردو) for proper display. Not Roman Urdu.'
    langInstruction = `\n\nIMPORTANT: Patient language is "${detectedLang}". ${modalityHint}`
  } else {
    langInstruction = `\n\nIMPORTANT: Patient language is English. Reply in English.`
  }

  let fullSystemPrompt = systemPrompt + patientContext + langInstruction + clinicLearningBlock
  if (handoffContext) {
    fullSystemPrompt += `\n\n${handoffContext}`
  }

  const messages: AgentMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...history.slice(-HISTORY_WINDOW * 2),
    { role: 'user', content: actualMessage },
  ]

  const toolCallLog: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = []

  if (agentConfig.proactiveDetect) {
    const proactiveResults = await agentConfig.proactiveDetect(actualMessage, ctx)
    for (const pr of proactiveResults) {
      messages.push({ role: 'system', content: `Tool ${pr.name} was called proactively. Result: ${pr.result}` })
      toolCallLog.push({ name: pr.name, args: pr.args, result: JSON.parse(pr.result) })
    }
  }

  if (agentConfig.beforeLLM) {
    const shortCircuit = await agentConfig.beforeLLM(actualMessage, ctx)
    if (shortCircuit !== null) {
      history.push({ role: 'user', content: actualMessage })
      history.push({ role: 'assistant', content: shortCircuit })
      await store.set(sessionKey, history, SESSION_TTL)
      return { reply: shortCircuit, toolCalls: toolCallLog, modality: 'text' }
    }
  }

  const agentTools = getToolsForAgentByName(agentName)
  const temperature = agentConfig.temperature ?? 0.4
  const maxTokens = agentConfig.maxTokens ?? 500

  try {
    const completion = await createChatCompletion({
      messages: messages as never,
      tools: agentTools as never,
      temperature,
      max_tokens: maxTokens,
    })

    const assistantMsg = completion.choices[0]?.message as {
      content?: string
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
    }

    let parsedToolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = assistantMsg.tool_calls || []
    let cleanReply = assistantMsg.content || ''

    if ((!parsedToolCalls || parsedToolCalls.length === 0) && assistantMsg.content) {
      const textCalls = parseTextToolCalls(assistantMsg.content)
      if (textCalls.length > 0) {
        parsedToolCalls = textCalls.map((tc, i) => ({
          id: `textcall_${i}`,
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        }))
        cleanReply = assistantMsg.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
      }
    }

    if (parsedToolCalls && parsedToolCalls.length > 0) {
      messages.push({ role: 'assistant', content: cleanReply, tool_calls: parsedToolCalls })

      for (const tc of parsedToolCalls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* ignore */ }
        const guarded = await executeToolGuarded(tc.function.name, args, ctx, agentConfig.toolNames, executeTool)
        const result = guarded.result
        if (guarded.blocked) {
          toolCallLog.push({ name: tc.function.name, args, result: JSON.parse(result) })
          messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
          continue
        }
        const parsedResult = JSON.parse(result)
        toolCallLog.push({ name: tc.function.name, args, result: parsedResult })
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })

        if (tc.function.name === 'book_appointment' && parsedResult.success && parsedResult.appointment?.id) {
          const verifyAppt = await db.appointment.findUnique({
            where: { id: parsedResult.appointment.id },
            select: { id: true, status: true },
          })
          if (!verifyAppt || verifyAppt.status !== 'booked') {
            console.warn(`[orchestrator] Booking verification FAILED for ${parsedResult.appointment.id}. Retrying...`)
            parsedResult.success = false
            parsedResult.error = 'Appointment was not saved. Please try again.'
            toolCallLog[toolCallLog.length - 1].result = parsedResult

            const retryResult = await executeTool(tc.function.name, args, ctx)
            const retryParsed = JSON.parse(retryResult)
            if (retryParsed.success && retryParsed.appointment?.id) {
              const verifyRetry = await db.appointment.findUnique({
                where: { id: retryParsed.appointment.id },
                select: { id: true, status: true },
              })
              if (verifyRetry && verifyRetry.status === 'booked') {
                parsedResult.success = true
                parsedResult.appointment = retryParsed.appointment
                parsedResult.error = undefined
                toolCallLog[toolCallLog.length - 1].result = parsedResult
                messages[messages.length - 1].content = JSON.stringify(parsedResult)
                console.log(`[orchestrator] Booking retry succeeded for ${retryParsed.appointment.id}`)
              }
            }
          }
        }
      }

      const finalCompletion = await createChatCompletion({
        messages: messages as never,
        temperature,
        max_tokens: maxTokens,
      })
      let finalReply = finalCompletion.choices[0]?.message?.content || 'Maaf karen, samajh nahi aayi.'

      let finalTextCalls = parseTextToolCalls(finalReply)
      let safetyCounter = 0
      while (finalTextCalls.length > 0 && toolCallLog.length < 6 && safetyCounter < 4) {
        safetyCounter++
        for (const tc of finalTextCalls) {
          const guarded = await executeToolGuarded(tc.name, tc.args, ctx, agentConfig.toolNames, executeTool)
          const result = guarded.result
          if (guarded.blocked) {
            toolCallLog.push({ name: tc.name, args: tc.args, result: JSON.parse(result) })
            messages.push({ role: 'tool', content: result, tool_call_id: `textcall_${toolCallLog.length}` })
            continue
          }
          toolCallLog.push({ name: tc.name, args: tc.args, result: JSON.parse(result) })
          messages.push({ role: 'tool', content: result, tool_call_id: `textcall_${toolCallLog.length}` })
        }
        const summaryCompletion = await createChatCompletion({
          messages: messages as never,
          temperature,
          max_tokens: maxTokens,
        })
        finalReply = summaryCompletion.choices[0]?.message?.content || finalReply
        finalTextCalls = parseTextToolCalls(finalReply)
      }

      finalReply = finalReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
      if (!finalReply) {
        const lastResult = toolCallLog[toolCallLog.length - 1]
        if (lastResult?.name === 'book_appointment' && lastResult.result && (lastResult.result as { success?: boolean }).success) {
          const appt = (lastResult.result as { appointment?: { doctor?: string; date?: string; time?: string; token?: number; fees?: { total?: number } } }).appointment
          if (appt) {
            finalReply = `Aapki ${appt.time} ki appointment Dr. ${appt.doctor} ke saath ho gayi hai, token ${appt.token}. Total fees: PKR ${appt.fees?.total}. Yaad rakhenge ya reminder bhej dun?`
          } else {
            finalReply = 'Aapki appointment confirm ho gayi. Shukriya!'
          }
        } else {
          finalReply = 'Maaf karen, kuch masla ho gaya. Clinic se contact karein.'
        }
      }

      if (opts.conversationId && (history.length >= 5 || toolCallLog.some((tc) => ['book_appointment', 'cancel_appointment', 'reschedule_appointment', 'transfer_to_human'].includes(tc.name)))) {
        const successfulBooking = toolCallLog.find((tc) => tc.name === 'book_appointment' && (tc.result as { success?: boolean })?.success)
        const cancelResult = toolCallLog.find((tc) => tc.name === 'cancel_appointment' && (tc.result as { success?: boolean })?.success)
        const rescheduleResult = toolCallLog.find((tc) => tc.name === 'reschedule_appointment' && (tc.result as { success?: boolean })?.success)

        let summary = ''
        if (successfulBooking) {
          const appt = (successfulBooking.result as { appointment?: { doctor?: string; date?: string; time?: string; token?: number } })?.appointment
          summary = `Booked: ${appt?.doctor || 'unknown'} on ${appt?.date || 'unknown'} at ${appt?.time || 'unknown'} (Token: ${appt?.token || 'N/A'})`
        } else if (cancelResult) {
          summary = `Cancelled appointment ${(cancelResult.result as { cancelled?: string })?.cancelled || ''}`
        } else if (rescheduleResult) {
          const appt = (rescheduleResult.result as { appointment?: { doctor?: string; date?: string; time?: string; token?: number } })?.appointment
          summary = `Rescheduled to: ${appt?.doctor || 'unknown'} on ${appt?.date || 'unknown'} at ${appt?.time || 'unknown'}`
        } else {
          const lastFewTurns = history.slice(-6).filter((m) => m.role === 'user')
          summary = lastFewTurns.map((m) => m.content?.slice(0, 60)).join(' | ')
        }

        try {
          await db.conversation.update({
            where: { id: opts.conversationId },
            data: { summary: summary.slice(0, 500) },
          })
        } catch (err) {
          console.error('[orchestrator] Failed to save conversation summary:', err)
        }
      }

      if (agentConfig.afterTools) {
        await agentConfig.afterTools(messages, toolCallLog, ctx)
      }

      const { validateAgentResponse, checkBranding } = await import('../validator')
      const hasBranding = checkBranding(finalReply)
      if (hasBranding) {
        finalReply = finalReply.replace(/\bClinicAI\b/gi, clinic.agentName || clinic.name)
          .replace(/\bClinic\s*AI\b/gi, clinic.agentName || clinic.name)
      }
      // Verify any booking the agent claims to have made against the database.
      const { db } = await import('../db')
      const validationResult = await validateAgentResponse(
        finalReply,
        toolCallLog.map((tc) => ({ name: tc.name, result: tc.result as Record<string, unknown> })),
        async (appointmentId: string) => {
          const found = await db.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, totalFee: true, status: true } })
          return found ? { exists: true, totalFee: found.totalFee, status: found.status } : { exists: false }
        },
      )
      if (!validationResult.valid && validationResult.shouldRegenerate && validationResult.stricterPrompt) {
        try {
          const regenCompletion = await createChatCompletion({
            messages: [
              ...messages,
              { role: 'system', content: validationResult.stricterPrompt },
              { role: 'assistant', content: finalReply },
              { role: 'system', content: 'Your previous response had issues. Please regenerate.' },
            ] as never,
            temperature: 0.2,
            max_tokens: maxTokens,
          })
          const regenedReply = regenCompletion.choices[0]?.message?.content
          if (regenedReply && regenedReply.trim().length > 5) {
            finalReply = regenedReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
          }
        } catch (regenErr) {
          console.error('[orchestrator] Regeneration failed:', regenErr)
        }
      }

      if (history.length >= 20) {
        const { summary: llmSummary, updatedHistory } = await summarizeOldTurns(history, opts.clinicId)
        history = updatedHistory
        if (opts.conversationId && llmSummary && llmSummary !== 'Summary unavailable') {
          try {
            await db.conversation.update({
              where: { id: opts.conversationId },
              data: { summary: llmSummary.slice(0, 500) },
            })
          } catch (err) {
            console.error('[orchestrator] Failed to save summarized conversation:', err)
          }
        }
      }

      history.push({ role: 'user', content: actualMessage })
      history.push({ role: 'assistant', content: finalReply })
      await store.set(sessionKey, history, SESSION_TTL)

      if (inputModality === 'voice') {
        const { synthesizeSpeech } = await import('../voice')
        const ttsResult = await synthesizeSpeech(finalReply, { voice: ttsVoice })
        return {
          reply: finalReply, toolCalls: toolCallLog, modality: 'voice',
          voiceReplyBase64: ttsResult.audioBase64 || undefined,
          voiceReplyFormat: ttsResult.format, transcript,
        }
      }

      return { reply: finalReply, toolCalls: toolCallLog, modality: 'text' }
    }

    const reply = cleanReply || clinic.agentFallback

    if (history.length >= 20) {
      const { summary: llmSummary, updatedHistory } = await summarizeOldTurns(history, opts.clinicId)
      history = updatedHistory
      if (opts.conversationId && llmSummary && llmSummary !== 'Summary unavailable') {
        try {
          await db.conversation.update({
            where: { id: opts.conversationId },
            data: { summary: llmSummary.slice(0, 500) },
          })
        } catch (err) {
          console.error('[orchestrator] Failed to save summarized conversation:', err)
        }
      }
    }

    if (agentConfig.afterTools) {
      await agentConfig.afterTools(messages, toolCallLog, ctx)
    }

    history.push({ role: 'user', content: actualMessage })
    history.push({ role: 'assistant', content: reply })
    await store.set(sessionKey, history, SESSION_TTL)

    if (inputModality === 'voice') {
      const { synthesizeSpeech } = await import('../voice')
      const ttsResult = await synthesizeSpeech(reply, { voice: ttsVoice })
      return {
        reply, toolCalls: toolCallLog, modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        voiceReplyFormat: ttsResult.format, transcript,
      }
    }

    return { reply, toolCalls: toolCallLog, modality: 'text' }
  } catch (err) {
    console.error('Orchestrator error:', err)

    if (agentConfig.buildFallback) {
      const fallback = await agentConfig.buildFallback(actualMessage, ctx)
      return { reply: fallback, toolCalls: toolCallLog, error: String(err), modality: 'text' }
    }

    const { ruleBasedFallback } = await import('./fallback')
    const fallback = await ruleBasedFallback(actualMessage, ctx)

    if (inputModality === 'voice') {
      const { synthesizeSpeech } = await import('../voice')
      const ttsResult = await synthesizeSpeech(fallback, { voice: ttsVoice })
      return {
        reply: fallback, toolCalls: toolCallLog, modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        voiceReplyFormat: ttsResult.format, transcript, error: String(err),
      }
    }
    return { reply: fallback, toolCalls: toolCallLog, error: String(err), modality: 'text' }
  }
}
