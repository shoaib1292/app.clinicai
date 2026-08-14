import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { decryptPhone } from '@/lib/phone-encryption'
import { ok, err, handle } from '@/lib/api'

// GET /api/patients?search=&noShowOnly=
async function list(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const search = url.searchParams.get('search')?.trim() || ''
  const noShowOnly = url.searchParams.get('noShowOnly') === 'true'
  const limit = Math.min(100, Number(url.searchParams.get('limit') || '50'))

  const where: Record<string, unknown> = { clinicId }
  if (noShowOnly) where.noShowCount = { gt: 0 }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phoneLast4: { contains: search } },
    ]
  }

  const patients = await db.patient.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: { _count: { select: { appointments: true, familyMembers: true, conversations: true } } },
  })

  // Decrypt phone for authorized clinic staff; phoneHash stays server-side only.
  return ok(patients.map((p) => ({
    id: p.id,
    name: p.name,
    phone: decryptPhone(p.phone),
    phoneLast4: p.phoneLast4,
    gender: p.gender,
    preferredLanguage: p.preferredLanguage,
    totalVisits: p.totalVisits,
    noShowCount: p.noShowCount,
    invalidBookingCount: p.invalidBookingCount,
    optInMarketing: p.optInMarketing,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    _count: p._count,
  })))
}

export const GET = handle(list)
