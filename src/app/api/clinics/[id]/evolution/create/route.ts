import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType } from '@/lib/session'
import { createEvolutionInstance, connectEvolutionWithCode, getEvolutionQR, saveWhatsAppConnection, friendlyEvoError } from '@/lib/evolution'
import { ok, err, handle } from '@/lib/api'

async function create(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireType('clinic_admin')
  if (session.clinicId !== id) return err('Unauthorized', 403)

  const clinic = await db.clinic.findUnique({ where: { id } })
  if (!clinic) return err('Clinic not found', 404)

  const body = await req.json().catch(() => ({}))
  const mode: 'qr' | 'code' = body.mode === 'code' ? 'code' : 'qr'
  const phone: string | undefined = body.phone

  const instanceName = `clinic_${clinic.slug}_${Date.now().toString(36)}`

  const result = await createEvolutionInstance(id, instanceName, { mode, phoneNumber: phone })

  if (result.error) {
    return err(friendlyEvoError(result.error), 500)
  }

  // For code mode, initiate connection to get the pairing code
  let pairingCode: string | undefined
  if (mode === 'code' && phone) {
    const codeResult = await connectEvolutionWithCode(instanceName, phone)
    if (codeResult.error) {
      return err(friendlyEvoError(codeResult.error), 502)
    }
    pairingCode = codeResult.pairingCode
  }

  // Save connection reference in DB
  await db.$transaction(async (tx) => {
    await tx.whatsAppConnection.create({
      data: {
        clinicId: id,
        mode: 'evo',
        phone: clinic.phone || '',
        evoInstanceName: instanceName,
        status: result.status === 'connected' ? 'connected' : mode === 'code' ? 'pairing' : 'connecting',
        filterGroups: true,
        filterStatus: true,
      },
    })
    await tx.clinic.update({
      where: { id },
      data: {
        evolutionInstance: instanceName,
        evolutionConnected: result.status === 'connected',
      },
    })
  })

  return ok({
    instanceName,
    qrCode: result.qrCode,
    pairingCode,
    status: result.status,
  })
}

export const POST = handle(create)
