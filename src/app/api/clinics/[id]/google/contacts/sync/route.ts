import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { ok, err, notFound, handle } from '@/lib/api'
import { syncContacts, getClinicContacts } from '@/lib/providers/google-contacts'

export const POST = handle(async (_req: NextRequest, _ctx: { params: Promise<{ id: string }> }) => {
  const { clinicId } = await requireClinicScope()

  const connection = await db.googleConnection.findFirst({
    where: { clinicId, contactsEnabled: true, status: 'active' },
  })

  if (!connection) return err('Google Contacts is not enabled. Connect Google and enable Contacts first.', 400)

  const contacts = await getClinicContacts(clinicId)
  const result = await syncContacts(connection.id, clinicId, contacts)

  return ok(result)
})
