/**
 * GET /api/patient/clinics/[id]/slots
 * Get available slots for a doctor on a given date.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'
import { generateSlotsForDoctorDate } from '@/lib/schedule'

async function list(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  await requirePatientAuth(req)

  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const dateStr = url.searchParams.get('date') // YYYY-MM-DD

  if (!doctorId) return err('doctorId is required', 400)

  const startOfDay = dateStr
    ? new Date(dateStr + 'T00:00:00.000Z')
    : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')

  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  // Auto-generate slots on demand so patients always see up-to-date availability
  await generateSlotsForDoctorDate(doctorId, startOfDay)

  const slots = await db.slot.findMany({
    where: {
      doctorId,
      clinicId,
      status: 'open',
      date: { gte: startOfDay, lt: endOfDay },
    },
    select: {
      id: true,
      startTime: true,
      tokenNo: true,
    },
    orderBy: { startTime: 'asc' },
  })

  return ok(slots)
}

export const GET = handle(list)
