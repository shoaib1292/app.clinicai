import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { generateSlotsForDoctorDate } from '@/lib/schedule'
import { ok, err, handle } from '@/lib/api'

// Public endpoint: GET /api/public/slots?doctorId=&date=
// No auth required — for shareable booking links
async function list(req: NextRequest) {
  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const dateStr = url.searchParams.get('date')
  if (!doctorId || !dateStr) return err('doctorId and date required', 400)

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor) return err('Doctor not found', 404)

  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  await generateSlotsForDoctorDate(doctorId, date)

  const slots = await db.slot.findMany({
    where: {
      doctorId,
      date: {
        gte: new Date(Date.UTC(y, m - 1, d)),
        lt: new Date(Date.UTC(y, m - 1, d + 1)),
      },
      status: 'open',
    },
    orderBy: { startTime: 'asc' },
  })
  const now = new Date()
  const open = slots.filter((s) => !s.holdExpiresAt || s.holdExpiresAt < now)

  return ok({
    doctor: { id: doctor.id, name: doctor.name, queueMode: doctor.queueMode },
    date: dateStr,
    slots: open.map((s) => ({ id: s.id, startTime: s.startTime, endTime: s.endTime, tokenNo: s.tokenNo })),
  })
}

export const GET = handle(list)
