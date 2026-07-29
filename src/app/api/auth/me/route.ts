import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function me() {
  const session = await getSession()
  if (!session) return err('Not authenticated', 401)

  // Hydrate with fresh clinic info for clinic-scoped users
  let clinic: { id: string; name: string; slug: string } | null = null
  if (session.clinicId) {
    const c = await db.clinic.findUnique({ where: { id: session.clinicId }, select: { id: true, name: true, slug: true } })
    clinic = c
  }

  return ok({
    ...session,
    clinic,
  })
}

export const GET = handle(me)
