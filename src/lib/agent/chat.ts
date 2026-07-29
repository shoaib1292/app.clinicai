import fs from 'fs/promises'
import path from 'path'
import { ensureLlmConfig, isReasoningModel, isNanoModel, getFallbackModel } from './llm-config'

export async function createChatCompletion(body: Record<string, unknown>, attemptModel?: string): Promise<{
  choices: Array<{ message: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>
}> {
  const configPath = path.join(process.cwd(), '.llm-config')
  let config: { baseUrl: string; apiKey: string; model?: string }
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
  } catch {
    await ensureLlmConfig()
    config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
  }
  const url = `${config.baseUrl}/chat/completions`

  const primaryModel = attemptModel || config.model || 'gpt-4o'
  let requestBody: Record<string, unknown> = { model: primaryModel, ...body }
  const modelForNormalization = primaryModel

  // gpt-4.1-nano and reasoning models need max_completion_tokens, not max_tokens
  const needsCompletionTokens = isReasoningModel(modelForNormalization) || isNanoModel(modelForNormalization)
  if (needsCompletionTokens) {
    if (requestBody.max_tokens !== undefined && requestBody.max_completion_tokens === undefined) {
      requestBody.max_completion_tokens = requestBody.max_tokens
    }
    delete requestBody.max_tokens
    if (isReasoningModel(modelForNormalization)) {
      delete requestBody.temperature
      delete requestBody.top_p
      delete requestBody.presence_penalty
      delete requestBody.frequency_penalty
      delete requestBody.logprobs
      delete requestBody.top_logprobs
      delete requestBody.seed
      delete requestBody.best_of
      if (!requestBody.reasoning_effort) {
        requestBody.reasoning_effort = 'medium'
      }
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })
  if (!res.ok) {
    const errBody = await res.text()
    const apiError = new Error(`LLM API error ${res.status}: ${errBody}`)

    const isRetry = !!attemptModel
    if (!isRetry) {
      const fallbackModel = getFallbackModel(primaryModel)
      if (fallbackModel && fallbackModel !== primaryModel) {
        console.warn(`[agent] Primary model ${primaryModel} failed (${res.status}). Falling back to ${fallbackModel}...`)
        return createChatCompletion(body, fallbackModel)
      }
    }

    throw apiError
  }
  return res.json()
}
