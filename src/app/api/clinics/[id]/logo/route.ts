import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { uploadImage } from '@/lib/storage'

// POST /api/clinics/[id]/logo  (multipart: file)
// Uploads the clinic/hospital logo to Cloudinary and sets clinic.logoUrl.
async function uploadLogo(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'

  // clinic_admin (own clinic) or platform admin
  let session
  try {
    session = await requireType('platform_admin', 'platform_staff')
  } catch {
    const cs = await requireClinicScope()
    if (cs.clinicId !== id) return err('Forbidden', 403)
    session = cs.session
  }

  const clinic = await db.clinic.findUnique({ where: { id } })
  if (!clinic) return err('Clinic not found', 404)

  const fd = await req.formData()
  const file = fd.get('file') as File | null
  if (!file || file.size === 0) return err('No file uploaded', 400)

  const buf = Buffer.from(await file.arrayBuffer())
  const url = await uploadImage(buf, 'clinicai/logos')

  const updated = await db.clinic.update({ where: { id }, data: { logoUrl: url } })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: id,
    action: 'clinic_logo_updated',
    target: `clinic:${id}`,
    ip,
  })

  return ok({ logoUrl: updated.logoUrl })
}

export const POST = handle(uploadLogo)
