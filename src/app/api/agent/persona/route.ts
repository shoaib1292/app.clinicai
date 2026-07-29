import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/agent/persona — get current clinic agent persona
async function getPersona(_req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      agentName: true,
      agentGender: true,
      agentTone: true,
      agentLanguages: true,
      agentWelcome: true,
      agentFallback: true,
    },
  })
  if (!clinic) return ok({})
  return ok({
    name: clinic.agentName || 'ClinicAI',
    gender: clinic.agentGender || 'female',
    tone: clinic.agentTone || 'professional',
    language: clinic.agentLanguages?.[0] || 'en',
    languages: clinic.agentLanguages || ['en'],
    welcome: clinic.agentWelcome,
    fallback: clinic.agentFallback,
  })
}

// PATCH /api/agent/persona — update agent persona
async function updatePersona(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.agentName = body.name
  if (body.gender !== undefined) data.agentGender = body.gender
  if (body.tone !== undefined) data.agentTone = body.tone
  if (body.language !== undefined) {
    data.agentLanguages = [body.language]
  }
  if (body.languages !== undefined) data.agentLanguages = body.languages
  if (body.welcome !== undefined) data.agentWelcome = body.welcome
  if (body.fallback !== undefined) data.agentFallback = body.fallback

  if (Object.keys(data).length === 0) return ok({ message: 'No fields to update' })

  await db.clinic.update({ where: { id: clinicId }, data })
  return ok({ ...data, updated: true })
}

export const GET = handle(getPersona)
export const PATCH = handle(updatePersona)
