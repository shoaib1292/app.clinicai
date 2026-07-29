import { ok, handle } from '@/lib/api'

// Mark all notifications as read (client-side state; no DB persistence in this version)
async function readAll() {
  return ok({ ok: true })
}

export const POST = handle(readAll)
