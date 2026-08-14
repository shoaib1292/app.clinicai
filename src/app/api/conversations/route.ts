import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { decryptPhone } from '@/lib/phone-encryption'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')

  const convos = await db.conversation.findMany({
    where: {
      clinicId,
      AND: [
        status ? { status } : {},
        search ? {
          OR: [
            { patient: { name: { contains: search } } },
            { patient: { phoneLast4: { contains: search } } },
            { summary: { contains: search } },
          ],
        } : {},
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      patient: true,
      _count: { select: { messages: true } },
    },
  })
  return ok(convos.map((c) => ({ ...c, patient: { ...c.patient, phone: decryptPhone(c.patient.phone) } })))
}

export const GET = handle(list)
