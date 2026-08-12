import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { resolveCalendarProvider } from '@/lib/providers/registry'

export const GET = handle(async (req: NextRequest) => {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')

  if (!start || !end) return err('start and end query params required', 400)

  const startDate = new Date(start)
  const endDate = new Date(end)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return err('Invalid date format', 400)
  }

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { timezone: true },
  })

  const tz = clinic?.timezone || 'Asia/Karachi'

  // Get DB slots that are open (not booked/blocked) for the doctor/time range
  const dbSlots = await db.slot.findMany({
    where: {
      clinicId,
      status: 'open',
      ...(doctorId ? { doctorId } : {}),
      date: { gte: new Date(startDate.toISOString().slice(0, 10)), lte: new Date(endDate.toISOString().slice(0, 10)) },
    },
  })

  // Try Google Calendar freebusy if connected
  const calResult = await resolveCalendarProvider(clinicId)
  let googleBusy: { start: Date; end: Date }[] = []

  if (calResult) {
    try {
      const busy = await calResult.provider.getBusySlots({
        start: startDate,
        end: endDate,
        timezone: tz,
      })
      googleBusy = busy.map(b => ({ start: b.start, end: b.end }))
    } catch (e) {
      console.error('[calendar/busy] Google freebusy failed, falling back to DB only', e)
    }
  }

  // Merge: mark DB slots as unavailable if they overlap with Google busy
  const merged = dbSlots.map(slot => {
    const slotDate = new Date(slot.date)
    const [sh, sm] = slot.startTime.split(':').map(Number)
    const [eh, em] = slot.endTime.split(':').map(Number)
    const slotStart = new Date(slotDate)
    slotStart.setUTCHours(sh, sm, 0, 0)
    const slotEnd = new Date(slotDate)
    slotEnd.setUTCHours(eh, em, 0, 0)

    const conflictsWithGoogle = googleBusy.some(b =>
      slotStart < b.end && slotEnd > b.start,
    )

    return {
      id: slot.id,
      doctorId: slot.doctorId,
      date: slot.date.toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: !conflictsWithGoogle,
      source: conflictsWithGoogle ? 'google_calendar_conflict' : 'db',
    }
  })

  return ok({
    slots: merged,
    googleConnected: !!calResult,
  })
})
