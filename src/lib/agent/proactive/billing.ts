import { executeTool } from '../execute-tool'
import type { AgentContext, ProactiveResult } from '../types'

export async function billingProactive(
  message: string,
  ctx: AgentContext,
): Promise<ProactiveResult[]> {
  const lower = message.toLowerCase()
  const results: ProactiveResult[] = []

  const feeIntent = /fee|fees|paisa|paise|rupiya|rupaye|kitna|kitne|kitni|charges|charge|price|cost|qeemat|payment|pay|ada|bank|transfer|jazzcash|easypaisa|screenshot|proof|bill|invoice|refund/i.test(lower)

  if (feeIntent) {
    const result = await executeTool('get_clinic_info', {}, ctx)
    results.push({ name: 'get_clinic_info', args: {}, result })
  }

  return results
}
