import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// Export clinic's feedback as CSV.
// Query params: ?doctorId=... (optional filter)
async function exportCsv(req: NextRequest) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!session.clinicId) return new Response('No clinic scope', { status: 403 })

  const url = new URL(req.url)
  const doctorId = url.searchParams.get('doctorId')

  const where: { clinicId: string; doctorId?: string } = { clinicId: session.clinicId }
  if (doctorId) where.doctorId = doctorId

  const feedback = await db.appointmentFeedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { name: true, phone: true } },
      doctor: { select: { name: true, speciality: true } },
      appointment: {
        select: {
          start: true,
          service: { select: { name: true } },
        },
      },
    },
  })

  // Build CSV
  const headers = [
    'Date',
    'Doctor',
    'Speciality',
    'Patient',
    'Patient Phone',
    'Service',
    'Appointment Date',
    'Rating',
    'Wait Time (min)',
    'Tags',
    'Comment',
    'Channel',
  ]

  const escapeCsv = (s: string | null | undefined): string => {
    if (s === null || s === undefined) return ''
    const str = String(s)
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = feedback.map((f) => {
    let tags: string[] = []
    try { tags = JSON.parse(f.tags || '[]') as string[] } catch { /* ignore */ }
    return [
      escapeCsv(f.createdAt.toISOString()),
      escapeCsv(f.doctor.name),
      escapeCsv(f.doctor.speciality),
      escapeCsv(f.patient.name),
      escapeCsv(f.patient.phone),
      escapeCsv(f.appointment.service?.name ?? ''),
      escapeCsv(f.appointment.start.toISOString()),
      String(f.rating),
      f.waitTimeMins !== null ? String(f.waitTimeMins) : '',
      escapeCsv(tags.join('; ')),
      escapeCsv(f.comment),
      escapeCsv(f.channel),
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\r\n')

  // Add UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF'
  const csvWithBom = bom + csv

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true },
  })
  const clinicSlug = (clinic?.name || 'clinic').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `feedback_${clinicSlug}_${dateStr}.csv`

  return new Response(csvWithBom, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export const GET = exportCsv
