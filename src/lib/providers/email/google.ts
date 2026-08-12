import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google-token-manager'
import type { EmailProvider, SendEmailParams, EmailSendResult } from '../types'
import { db } from '@/lib/db'

export class GoogleGmailProvider implements EmailProvider {
  constructor(private connectionId: string, private clinicId: string) {}

  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    const auth = await getOAuth2Client(this.connectionId)
    if (!auth) return { ok: false, error: 'Gmail auth failed — connection may be expired' }

    const gmail = google.gmail({ version: 'v1', auth })

    try {
      const to = Array.isArray(params.to) ? params.to.join(', ') : params.to
      const from = params.from || 'me'

      const emailLines: string[] = []
      emailLines.push(`From: ${from}`)
      emailLines.push(`To: ${to}`)
      emailLines.push(`Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`)
      emailLines.push('MIME-Version: 1.0')
      emailLines.push('Content-Type: text/html; charset=utf-8')
      if (params.replyTo) emailLines.push(`Reply-To: ${params.replyTo}`)
      emailLines.push('')
      emailLines.push(params.html)

      const raw = Buffer.from(emailLines.join('\n')).toString('base64url')

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      })

      // Log to EmailLog
      try {
        await db.emailLog.create({
          data: {
            to,
            from: from === 'me' ? '' : from,
            subject: params.subject,
            category: 'notification',
            provider: 'google',
            messageId: res.data.id || undefined,
            status: 'sent',
            sentAt: new Date(),
            clinicId: this.clinicId,
          },
        })
      } catch {
        // Non-critical — don't fail the send
      }

      await db.googleAuditLog.create({
        data: {
          clinicId: this.clinicId,
          connectionId: this.connectionId,
          action: 'email_sent',
          metadata: JSON.stringify({ to, subject: params.subject }),
        },
      })

      return { ok: true, messageId: res.data.id || undefined }
    } catch (err) {
      console.error('[gmail] Send error:', err)
      return { ok: false, error: String(err) }
    }
  }
}
