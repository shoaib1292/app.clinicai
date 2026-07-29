import { ImapFlow } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'

// Read-only IMAP client for the ClinicAI platform mailbox (admin@clinicai.pk).
// Uses the IMAPS endpoint (mail.clinicai.pk:993).
// We only READ — no send/delete — to keep this a small professional inbox viewer.

export interface MailboxMessageSummary {
  uid: number
  from: string
  to: string
  subject: string
  date: string | null
  seen: boolean
  hasAttachments: boolean
  snippet: string
}

export interface MailboxAttachment {
  filename: string
  contentType: string
  size: number
}

export interface MailboxMessage {
  uid: number
  from: string
  to: string
  subject: string
  date: string | null
  seen: boolean
  text: string
  html: string | null
  attachments: MailboxAttachment[]
}

function client(): ImapFlow {
  const host = process.env.MAIL_IMAP_HOST || process.env.MAIL_DOMAIN || 'mail.clinicai.pk'
  const port = Number(process.env.MAIL_IMAP_PORT || 993)
  const user = process.env.MAILBOX_USER || process.env.PLATFORM_ADMIN_EMAIL || 'admin@clinicai.pk'
  const pass = process.env.MAILBOX_PASS || ''
  return new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  })
}

function addr(list: { address?: string; name?: string }[] | undefined): string {
  if (!list || list.length === 0) return ''
  const p = list[0]
  return p.name ? `${p.name} <${p.address}>` : p.address || ''
}

export async function listMessages(opts: { folder?: string; limit?: number } = {}): Promise<MailboxMessageSummary[]> {
  const folder = opts.folder || 'INBOX'
  const limit = Math.min(opts.limit || 50, 200)
  const c = client()
  try {
    await c.connect()
    const lock = await c.getMailboxLock(folder)
    try {
      const uids = await c.search({ seq: '*/' }, { uid: true })
      const recent = uids.slice(-limit).reverse() // newest first
      const out: MailboxMessageSummary[] = []
      for (const uid of recent) {
        const msg = await c.fetchOne(String(uid), { uid: true, envelope: true, flags: true, bodyStructure: true }, { uid: true })
        if (!msg) continue
        const env = msg.envelope
        const hasAtt = Array.isArray((msg as any).bodyStructure?.childNodes) && (msg as any).bodyStructure.childNodes.some((n: any) => n.disposition?.toLowerCase?.() === 'attachment')
        out.push({
          uid: Number(uid),
          from: addr(env?.from as any),
          to: addr(env?.to as any),
          subject: env?.subject || '(no subject)',
          date: env?.date ? new Date(env.date).toISOString() : null,
          seen: (msg.flags || []).includes('\\Seen'),
          hasAttachments: hasAtt,
          snippet: '',
        })
      }
      return out
    } finally {
      lock.release()
    }
  } catch (e) {
    console.error('[mailbox] list failed:', e)
    throw e
  } finally {
    await c.logout().catch(() => {})
  }
}

export async function getMessage(uid: number): Promise<MailboxMessage | null> {
  const c = client()
  try {
    await c.connect()
    const lock = await c.getMailboxLock('INBOX')
    try {
      const raw = await c.download(String(uid), undefined, { uid: true })
      if (!raw) return null
      const buf = await raw.content.buffer
      const parsed: ParsedMail = await simpleParser(buf as Buffer)

      // Mark as seen (write flag — harmless, read-only from user's perspective)
      try {
        await c.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
      } catch {
        /* ignore flag errors */
      }

      const attachments: MailboxAttachment[] = (parsed.attachments || []).map((a) => ({
        filename: a.filename || 'attachment',
        contentType: a.contentType || 'application/octet-stream',
        size: a.size || 0,
      }))

      return {
        uid: Number(uid),
        from: addr(parsed.from ? [parsed.from as any] : undefined),
        to: addr(Array.isArray(parsed.to) ? (parsed.to as any) : parsed.to ? [parsed.to as any] : undefined),
        subject: parsed.subject || '(no subject)',
        date: parsed.date ? new Date(parsed.date).toISOString() : null,
        seen: true,
        text: parsed.text || '',
        html: parsed.html || null,
        attachments,
      }
    } finally {
      lock.release()
    }
  } catch (e) {
    console.error('[mailbox] get failed:', e)
    throw e
  } finally {
    await c.logout().catch(() => {})
  }
}

// Scan the bounce/return folder for delivery-failure reports and return the
// raw X-EmailLog-Id headers found in them (so the caller can mark logs bounced).
export async function collectBounceLogIds(opts: { folder?: string; limit?: number } = {}): Promise<string[]> {
  const folder = opts.folder || 'INBOX'
  const limit = Math.min(opts.limit || 100, 500)
  const c = client()
  const ids: string[] = []
  try {
    await c.connect()
    const lock = await c.getMailboxLock(folder)
    try {
      const uids = await c.search({ seen: false }, { uid: true })
      const recent = uids.slice(-limit)
      for (const uid of recent) {
        const raw = await c.download(String(uid), undefined, { uid: true })
        if (!raw) continue
        const buf = await raw.content.buffer
        const parsed: ParsedMail = await simpleParser(buf as Buffer)
        const headerId = (parsed.headers.get('x-emaillog-id') as string) || ''
        if (headerId) ids.push(headerId)
      }
      return ids
    } finally {
      lock.release()
    }
  } catch (e) {
    console.error('[mailbox] bounce scan failed:', e)
    return ids
  } finally {
    await c.logout().catch(() => {})
  }
}
