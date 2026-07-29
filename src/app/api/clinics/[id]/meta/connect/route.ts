import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType, auditLog } from '@/lib/session'
import { validateMetaCredentials } from '@/lib/meta'
import { ok, err, handle } from '@/lib/api'

interface MetaConnectBody {
  phoneNumberId: string
  accessToken: string
  wabaId: string
  phone: string
}

async function connect(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('clinic_admin', 'platform_admin')
  if (session.type === 'clinic_admin' && session.clinicId !== id) return err('Unauthorized', 403)

  const body = (await req.json()) as MetaConnectBody
  const { phoneNumberId, accessToken, wabaId, phone } = body

  if (!phoneNumberId || !accessToken || !wabaId || !phone) {
    return err('All fields required: phoneNumberId, accessToken, wabaId, phone', 400)
  }

  // Validate credentials with Meta
  const validation = await validateMetaCredentials(phoneNumberId, accessToken, wabaId)
  if (!validation.ok) {
    return err(validation.error || 'Invalid Meta credentials', 400)
  }

  await db.$transaction(async (tx) => {
    // Upsert WhatsApp connection
    const existing = await tx.whatsAppConnection.findFirst({
      where: { clinicId: id, mode: 'meta' },
    })
    if (existing) {
      await tx.whatsAppConnection.update({
        where: { id: existing.id },
        data: {
          phone,
          metaPhoneId: phoneNumberId,
          metaTokenEnc: validation.encryptedToken,
          status: 'connected',
        },
      })
    } else {
      await tx.whatsAppConnection.create({
        data: {
          clinicId: id,
          mode: 'meta',
          phone,
          metaPhoneId: phoneNumberId,
          metaTokenEnc: validation.encryptedToken,
          status: 'connected',
          filterGroups: true,
          filterStatus: true,
        },
      })
    }
    await tx.clinic.update({
      where: { id },
      data: {
        metaConnected: true,
        metaPhoneId: phoneNumberId,
        metaWabaId: wabaId,
      },
    })
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    clinicId: id,
    action: 'meta_connected',
    target: `clinic:${id}`,
  })

  return ok({ status: 'connected', phoneNumberId, wabaId })
}

export const POST = handle(connect)
