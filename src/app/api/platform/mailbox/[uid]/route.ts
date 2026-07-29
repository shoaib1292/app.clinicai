import { NextRequest } from 'next/server'
import { requireType } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { getMessage } from '@/lib/mailbox'

// GET /api/platform/mailbox/[uid]
// Returns the full parsed message (text/html + attachments) for a UID.
async function mailboxMessage(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  await requireType('platform_admin', 'platform_staff')
  const { uid } = await params
  const uidNum = Number(uid)
  if (!Number.isInteger(uidNum) || uidNum <= 0) return err('Invalid uid', 400)
  try {
    const message = await getMessage(uidNum)
    if (!message) return err('Message not found', 404)
    return ok({ message })
  } catch (e) {
    console.error('[mailbox] message route error:', e)
    return err('Mailbox unavailable', 502)
  }
}

export const GET = handle(mailboxMessage)
