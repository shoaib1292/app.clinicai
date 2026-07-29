/**
 * Telemedicine email notification template.
 * Uses the same ClinicAI branded layout as other notifications.
 */
import type { } from './notifications'

const LOGO_URL = process.env.LOGO_URL || 'https://clinicai.pk/logo-light.png'

const C = {
  page: '#f4f5f7',
  card: '#ffffff',
  border: '#e8eaed',
  black: '#0f0f0f',
  body: '#3c4043',
  muted: '#70757a',
  light: '#f8f9fa',
  white: '#ffffff',
}

function button(label: string, href: string) {
  return `<a href="${href}" target="_blank" style="display:inline-block;padding:14px 40px;background-color:${C.black};color:${C.white};text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:-0.1px;">${label}</a>`
}

function infoRow(label: string, value: string) {
  return `<tr><td style="padding:7px 0;color:${C.muted};font-size:13px;width:90px;">${label}</td><td style="padding:7px 0;font-weight:500;color:${C.black};font-size:14px;">${value}</td></tr>`
}

function layout(opts: { subject: string; preheader: string; content: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${opts.subject}</title>
  <style>
    @media only screen and (max-width:480px) {
      .wrap { padding: 20px 12px !important; }
      .card { border-radius: 8px !important; }
      .pad { padding: 24px 20px !important; }
      .btn { display:block !important; width:auto !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${opts.preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};" class="wrap">
    <tr><td style="padding:40px 16px;" align="center">
      <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr><td align="center">
          <img src="${LOGO_URL}" alt="ClinicAI" style="display:block;width:40px;height:auto;border-radius:6px;border:none;outline:none;">
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:${C.card};border-radius:10px;border:1px solid ${C.border};" class="card">
        <tr><td class="pad" style="padding:36px 36px 32px;font-size:15px;line-height:1.65;color:${C.body};">
          ${opts.content}
        </td></tr>
        <tr><td style="padding:0 36px;"><div style="border-top:1px solid ${C.border};"></div></td></tr>
        <tr><td class="pad" style="padding:20px 36px 28px;text-align:center;font-size:12px;color:${C.muted};line-height:1.8;">
          <div style="font-weight:600;color:${C.black};font-size:14px;margin-bottom:2px;">ClinicAI</div>
          <div>clinicai.pk &nbsp;·&nbsp; hello@clinicai.pk</div>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" style="margin-top:16px;">
        <tr><td style="font-size:11px;color:${C.muted};text-align:center;">
          This is a transactional email from ClinicAI.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function templateTelemedicineInvite(opts: {
  patientName: string
  doctorName: string
  appointmentDate: string
  appointmentTime: string
  joinUrl: string
}): { subject: string; html: string } {
  const content = `
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:${C.black};">Video Consultation Ready</p>
<p style="margin:0 0 16px;color:${C.muted};font-size:14px;">Hi ${opts.patientName}, Dr. ${opts.doctorName} is ready for your telemedicine consultation.</p>
<div style="border:1px solid ${C.border};border-radius:8px;padding:18px 20px;background:${C.light};margin-bottom:20px;">
  <table cellpadding="0" cellspacing="0" style="width:100%;">
    ${infoRow('Doctor', `Dr. ${opts.doctorName}`)}
    ${infoRow('Date', opts.appointmentDate)}
    ${infoRow('Time', opts.appointmentTime)}
  </table>
</div>
<div style="margin:8px 0 24px;text-align:center;">
  ${button('Join Video Call', opts.joinUrl)}
</div>
<div style="border:1px solid ${C.border};border-radius:6px;padding:14px 16px;background:${C.light};">
  <p style="margin:0;font-size:12px;color:${C.muted};">
    No app download needed — just click the link and join through your browser. Works on mobile and desktop.
  </p>
</div>`

  const html = layout({ subject: 'Your Video Consultation is Ready — ClinicAI', preheader: `Dr. ${opts.doctorName} is ready for your video consultation`, content })
  return { subject: 'Your Video Consultation is Ready — ClinicAI', html }
}
