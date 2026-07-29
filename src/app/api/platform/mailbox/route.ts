import { NextRequest } from 'next/server'
import { requireType } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { listMessages } from '@/lib/mailbox'

// GET /api/platform/mailbox?folder=INBOX&limit=50
// Lists recent messages in the platform mailbox (read-only inbox viewer).
async function mailboxList(req: NextRequest) {
  await requireType('platform_admin', 'platform_staff')
  const folder = req.nextUrl.searchParams.get('folder') || 'INBOX'
  const limit = Number(req.nextUrl.searchParams.get('limit') || 50)
  try {
    const messages = await listMessages({ folder, limit })
    return ok({ messages, folder })
  } catch (e) {
    console.error('[mailbox] list route error:', e)
    return err('Mailbox unavailable', 502)
  }
}

export const GET = handle(mailboxList)
