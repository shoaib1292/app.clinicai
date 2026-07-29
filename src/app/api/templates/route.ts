import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { getSession } from '@/lib/session'

async function listTemplates(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)

  const templates = await db.notificationTemplate.findMany({
    where: { clinicId: session.clinicId },
    orderBy: [{ triggerEvent: 'asc' }, { language: 'asc' }],
  })
  return ok({ templates })
}

async function updateTemplate(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)
  if (session.type !== 'clinic_admin') return err('Only clinic admins can edit templates', 403)

  const body = (await req.json()) as {
    id: string
    bodyTemplate?: string
    enabled?: boolean
    language?: string
    modality?: string
  }

  if (!body.id) return err('Template id required', 400)

  // Verify ownership before update
  const existing = await db.notificationTemplate.findFirst({
    where: { id: body.id, clinicId: session.clinicId },
  })
  if (!existing) return err('Template not found', 404)

  const data: Record<string, unknown> = {}
  if (typeof body.bodyTemplate === 'string') {
    if (body.bodyTemplate.trim().length === 0) return err('Template body cannot be empty', 400)
    if (body.bodyTemplate.length > 1024) return err('Template body too long (max 1024 chars)', 400)
    data.bodyTemplate = body.bodyTemplate
  }
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled
  if (typeof body.language === 'string') data.language = body.language
  if (typeof body.modality === 'string') data.modality = body.modality

  const updated = await db.notificationTemplate.update({
    where: { id: body.id },
    data,
  })
  return ok({ template: updated })
}

export const GET = handle(listTemplates)
export const PUT = handle(updateTemplate)
