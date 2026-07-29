import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireScope } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/platform/email-analytics
// Aggregates EmailLog into deliverability metrics + charts for Platform Admin.
// NOTE: true inbox-vs-spam placement is NOT measurable (receivers don't report
// folder placement), so we surface an honest "Deliverability / Spam proxy" from
// bounce + complaint + open signals.
async function emailAnalytics(_req: NextRequest) {
  await requireScope('email_analytics:read')

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const [statusCounts, categoryCounts, providerCounts, recent, perClinic] = await Promise.all([
    db.emailLog.groupBy({ by: ['status'], _count: { _all: true } }),
    db.emailLog.groupBy({ by: ['category'], _count: { _all: true } }),
    db.emailLog.groupBy({ by: ['provider'], _count: { _all: true } }),
    db.emailLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
    db.emailLog.groupBy({
      by: ['clinicId'],
      _count: { _all: true },
      where: { clinicId: { not: null } },
    }),
  ])

  const toMap = (rows: { _count: { _all: number }; [k: string]: unknown }[], key: string) =>
    Object.fromEntries(rows.map((r) => [String((r as any)[key]), r._count._all]))

  const status = toMap(statusCounts, 'status')
  const sent = status.sent || 0
  const delivered = status.delivered || 0
  const opened = status.opened || 0
  const bounced = status.bounced || 0
  const complained = status.complained || 0
  const failed = status.failed || 0

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)

  // Daily series (createdAt date -> status tallies)
  const byDay = new Map<string, { sent: number; opened: number; bounced: number; delivered: number }>()
  for (const r of recent) {
    const key = r.createdAt.toISOString().slice(0, 10)
    if (!byDay.has(key)) byDay.set(key, { sent: 0, opened: 0, bounced: 0, delivered: 0 })
    const e = byDay.get(key)!
    if (r.status === 'sent' || r.status === 'delivered' || r.status === 'opened') e.sent++
    if (r.status === 'opened') e.opened++
    if (r.status === 'bounced') e.bounced++
    if (r.status === 'delivered') e.delivered++
  }

  // Resolve clinic names for per-clinic table
  const clinicIds = perClinic.map((c) => c.clinicId as string).filter(Boolean)
  const clinicNames = clinicIds.length
    ? await db.clinic.findMany({ where: { id: { in: clinicIds } }, select: { id: true, name: true } })
    : []
  const nameById = new Map(clinicNames.map((c) => [c.id, c.name]))
  const clinicTable = perClinic
    .map((c) => ({
      clinicId: c.clinicId,
      clinicName: nameById.get(c.clinicId as string) || 'Unknown',
      sent: c._count._all,
    }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 20)

  return ok({
    overview: {
      sent,
      delivered,
      opened,
      bounced,
      complained,
      failed,
      total: sent + failed,
    },
    rates: {
      delivery: pct(delivered, sent),
      open: pct(opened, sent),
      bounce: pct(bounced, sent),
      spamComplaint: pct(complained, sent),
    },
    statusSplit: Object.entries(status).map(([name, value]) => ({ name, value })),
    categorySplit: Object.entries(toMap(categoryCounts, 'category')).map(([name, value]) => ({ name, value })),
    providerSplit: Object.entries(toMap(providerCounts, 'provider')).map(([name, value]) => ({ name: name || 'unknown', value })),
    daily: Array.from(byDay.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    perClinic: clinicTable,
  })
}

export const GET = handle(emailAnalytics)
