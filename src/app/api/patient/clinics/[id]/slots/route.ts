/**
 * GET /api/patient/clinics/[id]/slots
 * Get available slots for a doctor on a given date.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clinicId } = await params
  await requirePatientAuth(req)

  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')
  const dateStr = url.searchParams.get('date') // YYYY-MM-DD

  if (!doctorId) return err('doctorId is required', 400)

  // Default to today if no date provided
  const date = dateStr ? new Date(dateStr) : new Date()
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const slots = await db.slot.findMany({
    where: {
      doctorId,
      clinicId,
      status: 'open',
      startTime: { gte: startOfDay, lt: endOfDay },
    },
    select: {
      id: true,
      startTime: true,
      tokenNo: true,
      maxPatients: true,
      queueMode: true,
    },
    orderBy: { startTime: 'asc' },
  })

  return ok(slots)
}

export const GET = handle(list)
