/**
 * GET /api/patient/clinics
 * List clinics attached to this patient + search to add new clinics.
 */
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePatientAuth } from '@/lib/patient-session'
import { ok, err, handle } from '@/lib/api'

async function list(req: NextRequest) {
  const { appUserId } = await requirePatientAuth(req)
  const url = new URL(req.url)
  const search = url.searchParams.get('search')

  if (search && search.length >= 2) {
    // Search all clinics (for adding new one)
    const clinics = await db.clinic.findMany({
      where: {
        status: 'active',
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, slug: true, city: true, logoUrl: true },
      take: 10,
    })
    return ok(clinics)
  }

  // Return attached clinics
  const patients = await db.patient.findMany({
    where: { appUserId },
    select: {
      clinic: { select: { id: true, name: true, slug: true, city: true, logoUrl: true } },
    },
  })
  return ok(patients.map((p) => p.clinic))
}

export const GET = handle(list)
