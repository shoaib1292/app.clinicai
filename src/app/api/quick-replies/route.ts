import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, err, handle } from '@/lib/api'
import { getSession } from '@/lib/session'

// List this clinic's quick reply snippets
async function listSnippets(_req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)

  const snippets = await db.quickReplySnippet.findMany({
    where: { clinicId: session.clinicId },
    orderBy: [{ sortIdx: 'asc' }, { createdAt: 'asc' }],
  })
  return ok({ snippets })
}

// Create a new snippet
async function createSnippet(req: NextRequest) {
  const session = await getSession()
  if (!session) return err('Unauthorized', 401)
  if (!session.clinicId) return err('No clinic scope', 403)
  if (session.type !== 'clinic_admin' && session.type !== 'receptionist') {
    return err('Only clinic admins and receptionists can manage snippets', 403)
  }

  const body = (await req.json()) as {
    label: string
    body: string
    category?: string
    sortIdx?: number
  }

  if (!body.label || !body.body) return err('label and body are required', 400)
  if (body.label.length > 50) return err('label too long (max 50 chars)', 400)
  if (body.body.length > 1024) return err('body too long (max 1024 chars)', 400)

  const validCategories = ['greeting', 'booking', 'payment', 'info', 'general']
  const category = validCategories.includes(body.category || '') ? body.category! : 'general'

  // Get the max sortIdx for this clinic to append at the end
  const maxIdx = await db.quickReplySnippet.aggregate({
    where: { clinicId: session.clinicId },
    _max: { sortIdx: true },
  })

  const snippet = await db.quickReplySnippet.create({
    data: {
      clinicId: session.clinicId,
      label: body.label.trim(),
      body: body.body.trim(),
      category,
      sortIdx: body.sortIdx ?? (maxIdx._max.sortIdx ?? -1) + 1,
      createdBy: session.sub,
    },
  })
  return ok({ snippet })
}

export const GET = handle(listSnippets)
export const POST = handle(createSnippet)
