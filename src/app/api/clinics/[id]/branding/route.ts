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

    if (Object.keys(updateData).length > 0) {
      await db.clinic.update({ where: { id: clinicId }, data: updateData })
    }

    // Doctor branding fields (bio, languages, displayOnWebsite, imageKey).
    // Only doctors belonging to this clinic are touched.
    if (Array.isArray(body.doctors) && body.doctors.length > 0) {
      const ids = body.doctors.map((d: { id?: string }) => d.id).filter(Boolean)
      const ownDoctors = await db.doctor.findMany({ where: { id: { in: ids }, clinicId } })
      const ownIds = new Set(ownDoctors.map((d) => d.id))

      for (const patch of body.doctors) {
        if (!patch?.id || !ownIds.has(patch.id)) continue
        const docData: Record<string, unknown> = {}
        if (typeof patch.bio === 'string') docData.bio = patch.bio
        if (typeof patch.languages === 'string') docData.languages = patch.languages
        if (typeof patch.displayOnWebsite === 'boolean') docData.displayOnWebsite = patch.displayOnWebsite
        if (typeof patch.imageKey === 'string') docData.imageKey = patch.imageKey
        if (Object.keys(docData).length > 0) {
          await db.doctor.update({ where: { id: patch.id }, data: docData })
        }
      }
    }

    await auditLog({ clinicId, action: 'UPDATE', target: 'clinic_branding', metadata: { fields: Object.keys(updateData), doctors: Array.isArray(body.doctors) ? body.doctors.length : 0 } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Branding save error:', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
