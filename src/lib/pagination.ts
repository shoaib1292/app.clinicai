/**
 * ClinicAI — Cursor-based pagination helper.
 *
 * Usage:
 *   const { items, nextCursor, hasMore } = await paginate(db.appointment, {
 *     where: { clinicId },
 *     orderBy: [{ start: 'desc' }, { id: 'desc' }],
 *     include: { patient: true },
 *     cursor, // from query param
 *     limit,  // from query param (default 50, max 100)
 *   })
 *   return ok({ data: items, nextCursor, hasMore })
 */

export interface PaginateParams<T> {
  where?: T
  orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[]
  include?: Record<string, unknown>
  select?: Record<string, unknown>
  cursor?: string | null
  limit?: number
  maxLimit?: number
  defaultLimit?: number
}

export interface PaginateResult<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDelegate = { findMany: (args: any) => Promise<any[]> }

export async function paginate<T>(
  model: PrismaDelegate,
  params: PaginateParams<unknown>,
): Promise<PaginateResult<T>> {
  const {
    where,
    orderBy,
    include,
    select,
    cursor,
    maxLimit = 100,
    defaultLimit = 50,
  } = params

  const limit = Math.min(maxLimit, Math.max(1, params.limit ?? defaultLimit))
  const take = limit + 1 // fetch one extra to detect hasMore

  const args: Record<string, unknown> = {
    where: where ?? {},
    orderBy,
    take,
  }

  // Always add id: 'desc' as tiebreaker for stable pagination
  if (Array.isArray(orderBy)) {
    const hasId = orderBy.some((o: Record<string, unknown>) => 'id' in o)
    if (!hasId) args.orderBy = [...orderBy, { id: 'desc' }]
  } else if (!('id' in orderBy)) {
    args.orderBy = [orderBy, { id: 'desc' }]
  }

  if (include) args.include = include
  if (select) args.select = select

  if (cursor) {
    args.cursor = { id: cursor }
    args.skip = 1 // skip the cursor itself
  }

  const results = await model.findMany(args)
  const items = results.slice(0, limit) as T[]
  const hasMore = results.length > limit
  const nextCursor = hasMore ? (items[items.length - 1] as Record<string, unknown>).id as string : null

  return { items, nextCursor, hasMore }
}

/**
 * Build a paginated response object matching the standard ClinicAI API shape.
 */
export function paginatedResponse<T>(items: T[], nextCursor: string | null, hasMore: boolean) {
  return { items, nextCursor, hasMore }
}
