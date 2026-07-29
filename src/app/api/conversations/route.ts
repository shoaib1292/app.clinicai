import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
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
            { patient: { phone: { contains: search } } },
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
  return ok(convos)
}

export const GET = handle(list)
