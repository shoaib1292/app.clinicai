import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { getSession } from '@/lib/session'

// PATCH /api/templates/[id] — update a single template
async function updateTemplate(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)

  const { id } = await params
  const body = await req.json()

  const existing = await db.notificationTemplate.findFirst({
    where: { id, clinicId: session.clinicId },
  })
  if (!existing) return err('Template not found', 404)

  const data: Record<string, unknown> = {}
  if (typeof body.bodyTemplate === 'string') data.bodyTemplate = body.bodyTemplate
  if (typeof body.body === 'string') data.bodyTemplate = body.body
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled
  if (typeof body.language === 'string') data.language = body.language
  if (typeof body.modality === 'string') data.modality = body.modality
  if (typeof body.triggerEvent === 'string') data.triggerEvent = body.triggerEvent

  if (Object.keys(data).length === 0) return err('No valid fields to update', 400)

  const updated = await db.notificationTemplate.update({ where: { id }, data })
  return ok(updated)
}

export const PATCH = handle(updateTemplate)
