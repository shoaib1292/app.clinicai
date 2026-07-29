/**
 * Notification Channels — SMS + Email (Founder Doc §31)
 * SMS: Twilio fallback when WhatsApp unavailable
 * Email: Staff-only notifications (payment proofs, daily summaries, alerts)
 *
 * In sandbox, these are no-ops (log only). In production, configure via .env.
 */
import crypto from 'crypto'

// ── SMS (Twilio) ────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || ''
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'none'

/**
 * Send an SMS message via Twilio.
 * Used as fallback when WhatsApp is unavailable (founder doc §31).
 */
export async function sendSMS(to: string, body: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (SMS_PROVIDER === 'none' || !TWILIO_ACCOUNT_SID) {
    console.log(`[sms:sandbox] → ${to}: ${body.slice(0, 80)}...`)
    return { ok: true, messageId: `sandbox_${crypto.randomUUID()}` }
  }

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_FROM_NUMBER,
        To: to.replace(/[^0-9+]/g, ''),
        Body: body,
      }).toString(),
    })
    const data = await res.json()
    if (data.error) {
      return { ok: false, error: data.error.message }
    }
    return { ok: true, messageId: data.sid }
  } catch (err) {
    console.error('[sms] Error:', err)
    return { ok: false, error: String(err) }
  }
}

// ── Email (SMTP via nodemailer) ─────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const SMTP_FROM = process.env.SMTP_FROM || 'ClinicAI <noreply@clinicsai.pk>'

/**
 * Send an email. Uses nodemailer in production, logs in sandbox.
 * Staff-only: payment proofs, daily summaries, alerts (founder doc §31).
 */
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!SMTP_HOST) {
    console.log(`[email:sandbox] → ${to}: ${subject}`)
    return { ok: true, messageId: `sandbox_${crypto.randomUUID()}` }
  }

  try {
    // Dynamic import to avoid loading nodemailer in sandbox
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    })

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html,
    })

    return { ok: true, messageId: info.messageId }
  } catch (err) {
    console.error('[email] Error:', err)
    return { ok: false, error: String(err) }
  }
}

// ── Notification Dispatch ───────────────────────────────────────────────────

export interface NotificationOpts {
  clinicId?: string
  patientPhone?: string
  patientEmail?: string
  staffEmails?: string[]
  channel: 'whatsapp' | 'sms' | 'email' | 'all'
  body: string
  subject?: string
}

/**
 * Send a notification via the specified channel(s).
 * - WhatsApp: handled by the Evolution/Meta send functions (not here)
 * - SMS: Twilio fallback
 * - Email: SMTP (staff only)
 * - All: try WhatsApp first, SMS fallback, Email for staff
 */
export async function sendNotification(opts: NotificationOpts): Promise<{ whatsapp?: boolean; sms?: boolean; email?: boolean }> {
  const results: { whatsapp?: boolean; sms?: boolean; email?: boolean } = {}

  if (opts.channel === 'email' || opts.channel === 'all') {
    // Email to staff
    if (opts.staffEmails && opts.staffEmails.length > 0) {
      for (const email of opts.staffEmails) {
        const r = await sendEmail(email, opts.subject || 'ClinicAI Notification', opts.body)
        results.email = r.ok
      }
    }
    // Email to patient (rare — only if explicitly provided)
    if (opts.patientEmail) {
      const r = await sendEmail(opts.patientEmail, opts.subject || 'ClinicAI Notification', opts.body)
      results.email = r.ok
    }
  }

  if (opts.channel === 'sms' || opts.channel === 'all') {
    if (opts.patientPhone) {
      const r = await sendSMS(opts.patientPhone, opts.body)
      results.sms = r.ok
    }
  }

  return results
}
