import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType } from '@/lib/session'
import { hashPhone, last4 } from '@/lib/auth'
import { generateSlotsForDoctorDate, computeFees } from '@/lib/schedule'
import { store } from '@/lib/store'
import { ok, err, handle } from '@/lib/api'

// GET /api/slots/available?doctorId=&date=YYYY-MM-DD
async function available(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const dateStr = url.searchParams.get('date')
  if (!doctorId || !dateStr) return err('doctorId and date required', 400)

  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))

  // Validate doctor belongs to clinic
  const doctor = await db.doctor.findFirst({ where: { id: doctorId, clinicId } })
  if (!doctor) return err('Doctor not found', 404)

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
  const open = slots.filter((s) => {
    if (s.status !== 'open') return false
    if (s.holdExpiresAt && s.holdExpiresAt > now) return false
    return true
  })

  return ok({ doctor: { id: doctor.id, name: doctor.name, queueMode: doctor.queueMode }, slots: open })
}

export const GET = handle(available)
