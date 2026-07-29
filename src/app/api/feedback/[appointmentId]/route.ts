import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'

// Get feedback for a specific appointment (used by appointment detail page)
async function getFeedback(_req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params
  const feedback = await db.appointmentFeedback.findUnique({
    where: { appointmentId },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
    },
  })
  if (!feedback) return ok({ feedback: null })
  return ok({ feedback })
}

export const GET = handle(getFeedback)
