import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { getSession } from '@/lib/session'

async function updateSnippet(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)
  if (session.type !== 'clinic_admin' && session.type !== 'receptionist') {
    return err('Only clinic admins and receptionists can manage snippets', 403)
  }

  const { id } = await params
  const body = (await req.json()) as {
    label?: string
    body?: string
    category?: string
    sortIdx?: number
    enabled?: boolean
  }

  // Verify ownership
  const existing = await db.quickReplySnippet.findFirst({
    where: { id, clinicId: session.clinicId },
  })
  if (!existing) return err('Snippet not found', 404)

  const data: Record<string, unknown> = {}
  if (typeof body.label === 'string') {
    if (body.label.length === 0 || body.label.length > 50) return err('label must be 1-50 chars', 400)
    data.label = body.label.trim()
  }
  if (typeof body.body === 'string') {
    if (body.body.length === 0 || body.body.length > 1024) return err('body must be 1-1024 chars', 400)
    data.body = body.body.trim()
  }
  if (typeof body.category === 'string') {
    const validCategories = ['greeting', 'booking', 'payment', 'info', 'general']
    if (!validCategories.includes(body.category)) return err('invalid category', 400)
    data.category = body.category
  }
  if (typeof body.sortIdx === 'number') data.sortIdx = body.sortIdx
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled

  const updated = await db.quickReplySnippet.update({ where: { id }, data })
  return ok({ snippet: updated })
}

async function deleteSnippet(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)
  if (session.type !== 'clinic_admin' && session.type !== 'receptionist') {
    return err('Only clinic admins and receptionists can manage snippets', 403)
  }

  const { id } = await params
  const existing = await db.quickReplySnippet.findFirst({
    where: { id, clinicId: session.clinicId },
  })
  if (!existing) return err('Snippet not found', 404)

  await db.quickReplySnippet.delete({ where: { id } })
  return ok({ deleted: true })
}

export const PUT = handle(updateSnippet)
export const DELETE = handle(deleteSnippet)
