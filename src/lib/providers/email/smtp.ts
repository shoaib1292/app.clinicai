import crypto from 'crypto'
import type { EmailProvider, SendEmailParams, EmailSendResult } from '../types'

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const SMTP_FROM = process.env.SMTP_FROM || 'ClinicAI <noreply@clinicsai.pk>'

export class SmtpProvider implements EmailProvider {
  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    if (!SMTP_HOST) {
      console.log(`[email:sandbox] → ${params.to}: ${params.subject}`)
      return { ok: true, messageId: `sandbox_${crypto.randomUUID()}` }
    }

    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      })

      const to = Array.isArray(params.to) ? params.to.join(', ') : params.to

      const info = await transporter.sendMail({
        from: params.from || SMTP_FROM,
        to,
        subject: params.subject,
        text: params.text || params.html.replace(/<[^>]*>/g, ''),
        html: params.html,
        replyTo: params.replyTo,
        attachments: params.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      })

      return { ok: true, messageId: info.messageId }
    } catch (err) {
      console.error('[smtp] Error:', err)
      return { ok: false, error: String(err) }
    }
  }
}
