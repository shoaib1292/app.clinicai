/**
 * Notification Channels — SMS + Email (Founder Doc §31)
 * SMS: Twilio fallback when WhatsApp unavailable
 * Email: Staff-only notifications (payment proofs, daily summaries, alerts)
 *
 * In sandbox, these are no-ops (log only). In production, configure via .env.
 */
import crypto from 'crypto'
import { resolveEmailProvider } from '@/lib/providers/registry'

// ── Email Templates ──────────────────────────────────────────────────────────

export function templateEmailVerify({ name, verifyUrl }: { name: string; verifyUrl: string }): { subject: string; html: string } {
  const subject = 'Verify your ClinicAI email'
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 0; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 32px 32px 8px; text-align: center;">
      <img src="https://app.clinicai.pk/logo-light.png" alt="ClinicAI" style="height: 36px;">
    </td></tr>
    <tr><td style="padding: 24px 32px 8px; font-size: 20px; font-weight: 600; color: #111;">Verify your email</td></tr>
    <tr><td style="padding: 8px 32px 24px; font-size: 14px; color: #555; line-height: 1.6;">
      Hi ${name},<br><br>
      Thanks for signing up for ClinicAI. Click the button below to verify your email address and activate your account.
    </td></tr>
    <tr><td style="padding: 0 32px 32px; text-align: center;">
      <a href="${verifyUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">Verify Email</a>
    </td></tr>
    <tr><td style="padding: 0 32px 32px; font-size: 12px; color: #999;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="${verifyUrl}" style="color: #555; word-break: break-all;">${verifyUrl}</a>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}

export function templatePasswordReset({ name, resetUrl }: { name?: string; resetUrl: string }): { subject: string; html: string } {
  const subject = 'Reset your ClinicAI password'
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 0; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 32px 32px 8px; text-align: center;">
      <img src="https://app.clinicai.pk/logo-light.png" alt="ClinicAI" style="height: 36px;">
    </td></tr>
    <tr><td style="padding: 24px 32px 8px; font-size: 20px; font-weight: 600; color: #111;">Reset your password</td></tr>
    <tr><td style="padding: 8px 32px 24px; font-size: 14px; color: #555; line-height: 1.6;">
      ${name ? `Hi ${name},<br><br>` : ''}We received a request to reset your ClinicAI password. Click the button below to choose a new one.
    </td></tr>
    <tr><td style="padding: 0 32px 32px; text-align: center;">
      <a href="${resetUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">Reset Password</a>
    </td></tr>
    <tr><td style="padding: 0 32px 32px; font-size: 12px; color: #999;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="${resetUrl}" style="color: #555; word-break: break-all;">${resetUrl}</a>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}

export function templateStaffInvite({ name, clinicName, setupUrl }: { name: string; clinicName: string; setupUrl: string }): { subject: string; html: string } {
  const subject = `You've been added to ${clinicName} on ClinicAI`
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 0; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 32px 32px 8px; text-align: center;">
      <img src="https://app.clinicai.pk/logo-light.png" alt="ClinicAI" style="height: 36px;">
    </td></tr>
    <tr><td style="padding: 24px 32px 8px; font-size: 20px; font-weight: 600; color: #111;">Welcome to ClinicAI 👋</td></tr>
    <tr><td style="padding: 8px 32px 24px; font-size: 14px; color: #555; line-height: 1.6;">
      Hi ${name},<br><br>
      <strong>${clinicName}</strong> has added you as a team member on ClinicAI. Set up your password below to get started.
    </td></tr>
    <tr><td style="padding: 0 32px 32px; text-align: center;">
      <a href="${setupUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">Set Up Your Password</a>
    </td></tr>
    <tr><td style="padding: 0 32px 32px; font-size: 12px; color: #999;">
      This invitation link expires in 7 days.<br>
      If the button doesn't work, copy and paste this link:<br>
      <a href="${setupUrl}" style="color: #555; word-break: break-all;">${setupUrl}</a>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, html }
}

// ── SMS (Twilio) ────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || ''
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'none'

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

// ── Email (Provider-based: Google Gmail → SMTP/Brevo fallback) ──────────────

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  opts?: { category?: string; clinicId?: string },
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const clinicId = opts?.clinicId
  const { provider, type } = await resolveEmailProvider(clinicId)

  try {
    return await provider.sendEmail({ to, subject, html, text })
  } catch (err) {
    console.error(`[email:${type}] Error:`, err)

    // If Gmail fails and we have SMTP configured, try SMTP fallback
    if (type === 'google' && process.env.SMTP_HOST) {
      console.log('[email] Gmail failed, falling back to SMTP')
      const { SmtpProvider } = await import('@/lib/providers/email/smtp')
      return new SmtpProvider().sendEmail({ to, subject, html, text })
    }

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
        const r = await sendEmail(email, opts.subject || 'ClinicAI Notification', opts.body, undefined, { clinicId: opts.clinicId })
        results.email = r.ok
      }
    }
    // Email to patient
    if (opts.patientEmail) {
      const r = await sendEmail(opts.patientEmail, opts.subject || 'ClinicAI Notification', opts.body, undefined, { clinicId: opts.clinicId })
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
