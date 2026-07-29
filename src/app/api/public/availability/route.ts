import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { generateSlotsForDoctorDate } from '@/lib/schedule'
import { ok, err, handle } from '@/lib/api'

// Public endpoint: GET /api/public/availability?doctorId=&month=YYYY-MM&serviceId=
// Returns day-by-day availability for a full month — used by the booking calendar
// to highlight dates that have open slots.
async function list(req: NextRequest) {
  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const monthStr = url.searchParams.get('month')
  const serviceId = url.searchParams.get('serviceId')

  if (!doctorId || !monthStr) return err('doctorId and month required', 400)
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return err('month must be YYYY-MM', 400)

  const doctor = await db.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor) return err('Doctor not found', 404)

  const [year, month] = monthStr.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  let durationMin = doctor.slotDurationMin
  if (serviceId) {
    const service = await db.service.findFirst({ where: { id: serviceId, doctorId, active: true } })
    if (service) durationMin = service.durationMin
  }

  const now = new Date()
  const todayPkt = new Date(now.getTime() + 5 * 60 * 60 * 1000)
  const todayPktDate = todayPkt.getUTCDate()
  const todayPktMonth = todayPkt.getUTCMonth()
  const todayPktYear = todayPkt.getUTCFullYear()

  const result: { date: number; hasSlots: boolean; isPast?: boolean }[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const dateOnly = new Date(Date.UTC(year, month - 1, day))

    const isPast =
      year < todayPktYear ||
      (year === todayPktYear && month - 1 < todayPktMonth) ||
      (year === todayPktYear && month - 1 === todayPktMonth && day < todayPktDate)

    if (isPast) {
      result.push({ date: day, hasSlots: false, isPast: true })
      continue
    }

    await generateSlotsForDoctorDate(doctorId, date, durationMin)

    const openCount = await db.slot.count({
      where: { doctorId, date: dateOnly, status: 'open' },
    })

    result.push({ date: day, hasSlots: openCount > 0 })
  }

  return ok(result)
}

export const GET = handle(list)
