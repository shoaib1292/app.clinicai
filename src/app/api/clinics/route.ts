import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireType } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest) {
  await requireType('platform_admin', 'platform_staff')
  const url = new URL(req.url)
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status') || ''

  const clinics = await db.clinic.findMany({
    where: {
      AND: [
        search ? { name: { contains: search } } : {},
        status ? { status } : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { appointments: true, doctors: true, patients: true, conversations: true },
      },
    },
  })
  return ok(clinics)
}

export const GET = handle(list)
