import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

async function listRecords(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const staffId = url.searchParams.get('staffId')
  const staffType = url.searchParams.get('staffType')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const status = url.searchParams.get('status')

  const records = await db.staffAttendance.findMany({
    where: {
      clinicId,
      ...(staffId ? { staffId } : {}),
      ...(staffType ? { staffType } : {}),
      ...(status ? { status } : {}),
      ...(from || to ? {
        date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) },
      } : {}),
    },
    orderBy: { date: 'desc' },
    take: 200,
  })

  // Resolve staff names
  const recordsWithNames = await Promise.all(records.map(async r => {
    let name = r.staffId
    if (r.staffType === 'doctor') {
      const doc = await db.doctor.findUnique({ where: { id: r.staffId }, select: { name: true } })
      if (doc) name = doc.name
    } else {
      const rec = await db.receptionist.findUnique({ where: { id: r.staffId }, select: { name: true } })
      if (rec) name = rec.name
    }
    return { ...r, staffName: name }
  }))

  return ok(recordsWithNames)
}

export const GET = handle(listRecords)
