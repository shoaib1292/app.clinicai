import { db } from '../db'
import { store } from '../store'
import { hashPhone } from '../auth'
import { detectLanguage, replyLanguage, getVoiceForGender } from '../voice'

import { ensureLlmConfig } from './llm-config'
import { createChatCompletion } from './chat'
import { buildSystemPrompt } from './prompt'
import { TOOLS } from './tools-defs'
import { executeTool } from './execute-tool'
import { runProactiveTools } from './proactive'
import { parseTextToolCalls } from './parse-text-calls'
import { summarizeOldTurns } from './summarizer'
import { ruleBasedFallback } from './fallback'
import { SESSION_TTL, HISTORY_WINDOW } from './types'
import type { AgentContext, AgentMessage } from './types'

export async function runAgentSingle(opts: {
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
        reply: errorReply,
        toolCalls: [],
        modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        voiceReplyFormat: ttsResult.format,
        transcript: undefined,
        error: sttResult.error,
      }
    }
  }

  const sessionKey = `agent:session:${opts.clinicId}:${opts.patientPhone || 'anon'}`
  let history: AgentMessage[] = (await store.get<AgentMessage[]>(sessionKey)) || []

  const systemPrompt = await buildSystemPrompt(opts.clinicId)

  let patientContext = ''
  if (opts.patientPhone) {
    const phoneHash = hashPhone(opts.patientPhone + opts.clinicId)
    const patient = await db.patient.findUnique({
      where: { clinicId_phoneHash: { clinicId: opts.clinicId, phoneHash } },
      include: {
        familyMembers: true,
        appointments: {
          take: 5,
          orderBy: { start: 'desc' },
          include: { doctor: true },
        },
      },
    })
    if (patient) {
      patientContext = `\n\nPATIENT CONTEXT:\nName: ${patient.name || 'Unknown'}\nGender: ${patient.gender}\nPhone: ${patient.phone}\nNo-show count: ${patient.noShowCount}\nTotal visits: ${patient.totalVisits}`
      if (patient.familyMembers.length > 0) {
        patientContext += `\n\nREGISTERED FAMILY MEMBERS (use these names when booking for them):`
        for (const fm of patient.familyMembers) {
          const relationLabel: Record<string, string> = { spouse: 'Spouse', child: 'Child', parent: 'Parent', sibling: 'Sibling', other: 'Other' }
          patientContext += `\n- ${fm.name} (${relationLabel[fm.relation] || fm.relation}, ${fm.gender})`
        }
        patientContext += `\n\nWhen the patient asks to book for a family member, FIRST check this list. If the person is here, use their name and relation directly.`
      }
      if (patient.appointments.length > 0) {
        const upcomingAppts = patient.appointments.filter(a => a.status === 'booked' && a.start > new Date())
        if (upcomingAppts.length > 0) {
          patientContext += `\n\nUPCOMING APPOINTMENTS:`
          for (const a of upcomingAppts) {
            const dateStr = a.start.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
            const timeStr = a.start.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
            patientContext += `\n- ID: "${a.id}" | ${dateStr} ${timeStr} - Dr. ${a.doctor.name} - Status: ${a.status}`
          }
          patientContext += `\n\nWhen the patient asks about their appointments or wants to cancel/reschedule, use the appointment IDs shown above.`
        }
        const pastAppts = patient.appointments.filter(a => a.start < new Date())
        if (pastAppts.length > 0) {
          patientContext += `\n\nPAST APPOINTMENTS:`
          for (const a of pastAppts.slice(0, 3)) {
            const dateStr = a.start.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
            patientContext += `\n- ${dateStr} - Dr. ${a.doctor.name} - ${a.status}`
          }
        }
      }
      if (patient.name) ctx.patientName = patient.name
    }

    if (opts.conversationId) {
      try {
        const conv = await db.conversation.findUnique({
          where: { id: opts.conversationId },
          select: { summary: true },
        })
        if (conv?.summary) {
          patientContext += `\n\nCONVERSATION HISTORY: ${conv.summary}`
        }
      } catch (err) {
        console.error('[agent] Failed to load conversation summary:', err)
      }
    }
  }

  const detectedLang = detectLanguage(actualMessage)
  const replyLang = replyLanguage(detectedLang)
  let langInstruction: string
  if (replyLang === 'urdu') {
    const modalityHint = inputModality === 'voice'
      ? 'Use ROMAN URDU (English script, Urdu words) for correct audio pronunciation. Example: "Asalamualaikum, aap ki appointment confirm ho gayi" not "السلام علیکم، آپ کی اپوائنٹمنٹ کنفرم ہو گئی"'
      : 'Reply in URDU SCRIPT (اردو) for proper display. Not Roman Urdu.'
    langInstruction = `\n\nIMPORTANT: Patient language is "${detectedLang}". ${modalityHint}`
  } else {
    langInstruction = `\n\nIMPORTANT: Patient language is English. Reply in English.`
  }

  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt + patientContext + langInstruction },
    ...history.slice(-HISTORY_WINDOW * 2),
    { role: 'user', content: actualMessage },
  ]

  const toolCallLog: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = []

  const proactiveResults = await runProactiveTools(actualMessage, ctx)
  for (const pr of proactiveResults) {
    messages.push({ role: 'system', content: `Tool ${pr.name} was called proactively. Result: ${pr.result}` })
    toolCallLog.push({ name: pr.name, args: pr.args, result: JSON.parse(pr.result) })
  }

  try {
    const completion = await createChatCompletion({
      messages: messages as never,
      tools: TOOLS as never,
      temperature: 0.4,
      max_tokens: 500,
    })

    const assistantMsg = completion.choices[0]?.message as { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }

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
        const result = await executeTool(tc.function.name, args, ctx)
        const parsedResult = JSON.parse(result)
        toolCallLog.push({ name: tc.function.name, args, result: parsedResult })
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id })

        if (tc.function.name === 'book_appointment' && parsedResult.success && parsedResult.appointment?.id) {
          const verifyAppt = await db.appointment.findUnique({
            where: { id: parsedResult.appointment.id },
            select: { id: true, status: true },
          })
          if (!verifyAppt || verifyAppt.status !== 'booked') {
            console.warn(`[agent] Booking verification FAILED for appointment ${parsedResult.appointment.id}. Status: ${verifyAppt?.status || 'not found'}`)
            parsedResult.success = false
            parsedResult.error = 'Appointment was not saved in the database. Please try again.'
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
                toolCallLog[toolCallLog.length - 1].args = args
                messages[messages.length - 1].content = JSON.stringify(parsedResult)
                console.log(`[agent] Booking retry SUCCEEDED for ${retryParsed.appointment.id}`)
              } else {
                console.warn(`[agent] Booking retry also FAILED`)
              }
            }
          }
        }
      }

      const finalCompletion = await createChatCompletion({
        messages: messages as never,
        temperature: 0.4,
        max_tokens: 500,
      })
      let finalReply = finalCompletion.choices[0]?.message?.content || 'Maaf karen, samajh nahi aayi.'

      let finalTextCalls = parseTextToolCalls(finalReply)
      let safetyCounter = 0
      while (finalTextCalls.length > 0 && toolCallLog.length < 6 && safetyCounter < 4) {
        safetyCounter++
        for (const tc of finalTextCalls) {
          const result = await executeTool(tc.name, tc.args, ctx)
          toolCallLog.push({ name: tc.name, args: tc.args, result: JSON.parse(result) })
          messages.push({ role: 'tool', content: result, tool_call_id: `textcall_${toolCallLog.length}` })
        }
        const summaryCompletion = await createChatCompletion({
          messages: messages as never,
          temperature: 0.4,
          max_tokens: 500,
        })
        finalReply = summaryCompletion.choices[0]?.message?.content || finalReply
        finalTextCalls = parseTextToolCalls(finalReply)
      }

      finalReply = finalReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
      if (!finalReply) {
        const lastResult = toolCallLog[toolCallLog.length - 1]
        if (lastResult && lastResult.name === 'book_appointment' && lastResult.result && (lastResult.result as { success?: boolean }).success) {
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
          console.error('[agent] Failed to save conversation summary:', err)
        }
      }

      const { validateAgentResponse, checkBranding } = await import('../validator')
      const hasBranding = checkBranding(finalReply)
      if (hasBranding) {
        finalReply = finalReply.replace(/\bClinicAI\b/gi, clinic.agentName || clinic.name)
          .replace(/\bClinic\s*AI\b/gi, clinic.agentName || clinic.name)
      }
      const validationResult = await validateAgentResponse(finalReply, toolCallLog.map((tc) => ({ name: tc.name, result: tc.result as Record<string, unknown> })))
      if (!validationResult.valid && validationResult.shouldRegenerate && validationResult.stricterPrompt) {
        try {
          const regenCompletion = await createChatCompletion({
            messages: [
              ...messages,
              { role: 'system', content: validationResult.stricterPrompt },
              { role: 'assistant', content: finalReply },
              { role: 'system', content: 'Your previous response had issues. Please regenerate a correct response following the strict rules above.' },
            ] as never,
            temperature: 0.2,
            max_tokens: 500,
          })
          const regenedReply = regenCompletion.choices[0]?.message?.content
          if (regenedReply && regenedReply.trim().length > 5) {
            finalReply = regenedReply.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
          }
        } catch (regenErr) {
          console.error('[validator] Regeneration failed:', regenErr)
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
            console.error('[agent] Failed to save summarized conversation:', err)
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
          reply: finalReply,
          toolCalls: toolCallLog,
          modality: 'voice',
          voiceReplyBase64: ttsResult.audioBase64 || undefined,
          voiceReplyFormat: ttsResult.format,
          transcript,
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
          console.error('[agent] Failed to save summarized conversation:', err)
        }
      }
    }

    history.push({ role: 'user', content: actualMessage })
    history.push({ role: 'assistant', content: reply })
    await store.set(sessionKey, history, SESSION_TTL)

    if (inputModality === 'voice') {
      const { synthesizeSpeech } = await import('../voice')
      const ttsResult = await synthesizeSpeech(reply, { voice: ttsVoice })
      return {
        reply,
        toolCalls: toolCallLog,
        modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        voiceReplyFormat: ttsResult.format,
        transcript,
      }
    }

    return { reply, toolCalls: toolCallLog, modality: 'text' }
  } catch (err: unknown) {
    console.error('Agent error:', err)
    const proactiveBooking = toolCallLog.find((t) => t.name === 'book_appointment')
    if (proactiveBooking) {
      const result = proactiveBooking.result as Record<string, unknown>
      if (result.success) {
        const appt = result.appointment as Record<string, unknown> | undefined
        const reply = appt
          ? `Aapki ${appt.time} ki appointment Dr. ${appt.doctor} ke saath ho gayi hai, token ${appt.token}. Total fees: PKR ${(appt.fees as Record<string, unknown>)?.total}. Yaad rakhenge ya reminder bhej dun?`
          : 'Aapki appointment confirm ho gayi. Shukriya!'
        return { reply, toolCalls: toolCallLog, modality: 'text' }
      }
      if (result.error) {
        return { reply: `Maaf karen, appointment book nahi ho saki: ${result.error}`, toolCalls: toolCallLog, error: String(err), modality: 'text' }
      }
    }
    const proactiveSlots = toolCallLog.find((t) => t.name === 'list_available_slots')
    if (proactiveSlots && toolCallLog.length > 0) {
      const result = proactiveSlots.result as Record<string, unknown>
      const slots = result.slots as Array<Record<string, unknown>> | undefined
      if (slots && slots.length > 0) {
        const doc = result.doctor as Record<string, unknown> | undefined
        const slotLines = slots.map((s: Record<string, unknown>, i: number) => `${i + 1}. ${s.startTime} — Token #${s.tokenNo || 'N/A'}`).join('\n')
        const reply = `Doctor ${doc?.name || ''} ke liye aaj ki available slots:\n${slotLines}\n\nKonsa slot pasand karein ga?`
        return { reply, toolCalls: toolCallLog, error: String(err), modality: 'text' }
      }
    }
    const fallback = await ruleBasedFallback(actualMessage, ctx)
    if (inputModality === 'voice') {
      const { synthesizeSpeech } = await import('../voice')
      const ttsResult = await synthesizeSpeech(fallback, { voice: ttsVoice })
      return {
        reply: fallback,
        toolCalls: toolCallLog,
        modality: 'voice',
        voiceReplyBase64: ttsResult.audioBase64 || undefined,
        voiceReplyFormat: ttsResult.format,
        transcript,
        error: String(err),
      }
    }
    return { reply: fallback, toolCalls: toolCallLog, error: String(err), modality: 'text' }
  }
}
