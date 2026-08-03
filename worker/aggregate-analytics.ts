/**
 * Hourly analytics aggregation worker.
 * Runs as a BullMQ repeatable job, aggregates WebsiteAnalyticsEvent data
 * and writes summaries to Redis for fast dashboard access.
 */
import { db } from '@/lib/db'
import { store } from '@/lib/store'

export async function aggregateHourlyAnalytics() {
  const hourAgo = new Date(Date.now() - 3600 * 1000)

  try {
    const stats = await db.$queryRawUnsafe<Array<{ clinicId: string; eventType: string; count: bigint; uniqueVisitors: bigint }>>(
      `SELECT "clinicId", "eventType", COUNT(*) as count, COUNT(DISTINCT "ipHash") as "uniqueVisitors" FROM "WebsiteAnalyticsEvent" WHERE "timestamp" >= $1 GROUP BY "clinicId", "eventType"`,
      hourAgo.toISOString()
    )

    for (const row of stats) {
      const key = `website:stats:${row.clinicId}`
      await store.set(`${key}:${row.eventType}:hourly`, Number(row.count), 86400)
      await store.set(`${key}:visitors:hourly`, Number(row.uniqueVisitors), 86400)
    }

    console.log(`[Analytics Worker] Aggregated ${stats.length} stat rows`)
  } catch (err) {
    console.error('[Analytics Worker] Aggregation failed:', err)
  }
}

/** Purge raw events older than 90 days */
export async function purgeOldEvents() {
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000)
  try {
    const result = await db.websiteAnalyticsEvent.deleteMany({
      where: { timestamp: { lt: cutoff } },
    })
    if (result.count > 0) {
      console.log(`[Analytics Worker] Purged ${result.count} old events`)
    }
  } catch (err) {
    console.error('[Analytics Worker] Purge failed:', err)
  }
}
