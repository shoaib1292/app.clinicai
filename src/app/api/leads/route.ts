import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

interface LeadBody {
  clinicName: string
  adminName: string
  whatsappNumber: string
  city: string
  // Frontend sends bucket codes ("lt-500", "500-2000", "2000-5000", "gt-5000");
  // we map to a representative integer for the Int? column.
  monthlyAppointments?: string | number
}

const BUCKET_TO_INT: Record<string, number> = {
  'lt-500': 250,
  '500-2000': 1250,
  '2000-5000': 3500,
  'gt-5000': 7500,
}

function normalizeMonthlyAppointments(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  // Direct bucket match
  if (BUCKET_TO_INT[trimmed]) return BUCKET_TO_INT[trimmed]
  // Numeric string
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

async function createLead(req: NextRequest) {
  const body = (await req.json()) as LeadBody
  if (!body.clinicName || !body.adminName || !body.whatsappNumber || !body.city) {
    return err('Missing required fields', 400)
  }
  const lead = await db.lead.create({
    data: {
      clinicName: body.clinicName.trim(),
      adminName: body.adminName.trim(),
      whatsappNumber: body.whatsappNumber.trim(),
      city: body.city.trim(),
      monthlyAppointments: normalizeMonthlyAppointments(body.monthlyAppointments),
      status: 'new',
    },
  })
  return ok({ id: lead.id, status: 'new' })
}

export const POST = handle(createLead)
