import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  if (clinicId !== id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const body = await req.json()

    const updateData: Record<string, any> = {}
    const allowedFields = [
      'brandColor', 'headingFont', 'bodyFont', 'tagline', 'description',
      'agentName', 'agentGender', 'agentTone', 'agentLanguages', 'agentWelcome', 'agentFallback',
      'clinicStats',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    await db.clinic.update({ where: { id: clinicId }, data: updateData })

    await auditLog({ clinicId, action: 'UPDATE', target: 'clinic_branding', metadata: { fields: Object.keys(updateData) } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Branding save error:', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
