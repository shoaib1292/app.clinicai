import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { generateBookingToken } from '@/lib/booking-token'

const BASE_URL = process.env.PUBLIC_BOOKING_URL || process.env.PUBLIC_BASE_URL || 'https://clinicsai.pk'

async function getBookingLink(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { clinicId } = await requireClinicScope()
  const { id } = await params
  if (clinicId !== id) return err('Forbidden', 403)

  const clinic = await db.clinic.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!clinic) return err('Clinic not found', 404)

  const token = generateBookingToken(clinic.id, undefined, undefined, 30)
  const url = `${BASE_URL}/b/${token}`

  return ok({ url, token })
}

export const GET = handle(getBookingLink)
