/**
 * Automation Rule Evaluator (§9)
 *
 * Evaluates a JSON condition tree against an event context and returns
 * matching rules. Designed for the automation DSL described in the
 * build prompt: "a simple JSON condition tree evaluated by the worker."
 *
 * Condition tree structure:
 *   { "and": [ ...conditions ] }
 *   { "or":  [ ...conditions ] }
 *   { "not": { ...condition } }
 *   { "field": "appointment.status", "op": "eq", "value": "no_show" }
 *
 * Operators: eq, neq, lt, lte, gt, gte, in, contains, exists
 */

import { db } from './db'

export type ConditionOp = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'contains' | 'exists'

export interface FieldCondition {
  field: string
  op: ConditionOp
  value: unknown
}

export interface ConditionNode {
  and?: ConditionNode[]
  or?: ConditionNode[]
  not?: ConditionNode
  field?: string
  op?: ConditionOp
  value?: unknown
}

export interface EventContext {
  appointment?: Record<string, unknown>
  patient?: Record<string, unknown>
  clinic?: Record<string, unknown>
  doctor?: Record<string, unknown>
  [key: string]: unknown
}

export interface MatchedRule {
  id: string
  clinicId: string
  name: string
  actionType: string
  actionConfig: Record<string, unknown>
  triggerEvent: string
}

/**
 * Resolve a dotted field path against an event context.
 * e.g. "appointment.status" ->  ctx.appointment.status
 */
function resolveField(path: string, ctx: EventContext): unknown {
  const parts = path.split('.')
  let current: unknown = ctx
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Evaluate a single field condition.
 */
function evaluateField(cond: FieldCondition, ctx: EventContext): boolean {
  const actual = resolveField(cond.field, ctx)

  switch (cond.op) {
    case 'eq':
      return actual === cond.value
    case 'neq':
      return actual !== cond.value
    case 'lt':
      return typeof actual === 'number' && typeof cond.value === 'number' && actual < cond.value
    case 'lte':
      return typeof actual === 'number' && typeof cond.value === 'number' && actual <= cond.value
    case 'gt':
      return typeof actual === 'number' && typeof cond.value === 'number' && actual > cond.value
    case 'gte':
      return typeof actual === 'number' && typeof cond.value === 'number' && actual >= cond.value
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(actual)
    case 'contains':
      return typeof actual === 'string' && typeof cond.value === 'string' && actual.includes(cond.value)
    case 'exists':
      return actual !== null && actual !== undefined
    default:
      return false
  }
}

/**
 * Recursively evaluate a condition node.
 */
export function evaluateCondition(node: ConditionNode, ctx: EventContext): boolean {
  if (node.and) {
    return node.and.every((child) => evaluateCondition(child, ctx))
  }

  if (node.or) {
    return node.or.some((child) => evaluateCondition(child, ctx))
  }

  if (node.not) {
    return !evaluateCondition(node.not, ctx)
  }

  if (node.field && node.op) {
    return evaluateField(node as FieldCondition, ctx)
  }

  // Empty or unrecognized node = false (fail closed)
  return false
}

/**
 * Find all enabled rules matching a trigger event, evaluate their conditions
 * against the context, and return matching rules for execution.
 */
export async function findMatchingRules(
  triggerEvent: string,
  ctx: EventContext,
  clinicId: string
): Promise<MatchedRule[]> {
  const rules = await db.automationRule.findMany({
    where: {
      clinicId,
      triggerEvent,
      enabled: true,
      deletedAt: null,
    },
    orderBy: { priority: 'asc' },
  })

  const matched: MatchedRule[] = []

  for (const rule of rules) {
    // Skip if max executions reached (0 = unlimited)
    if (rule.maxExecutions > 0 && rule.executionCount >= rule.maxExecutions) {
      continue
    }

    let conditions: ConditionNode
    try {
      conditions = JSON.parse(rule.conditions)
    } catch {
      continue // malformed condition — skip
    }

    if (evaluateCondition(conditions, ctx)) {
      matched.push({
        id: rule.id,
        clinicId: rule.clinicId,
        name: rule.name,
        actionType: rule.actionType,
        actionConfig: JSON.parse(rule.actionConfig),
        triggerEvent: rule.triggerEvent,
      })
    }
  }

  return matched
}

/**
 * Resolve a dotted field path value from the EventContext.
 * Used by the action executor to get template variables.
 */
export function resolveContextValue(path: string, ctx: EventContext): string | number | undefined {
  const val = resolveField(path, ctx)
  if (val === null || val === undefined) return undefined
  if (typeof val === 'string' || typeof val === 'number') return val
  return String(val)
}
