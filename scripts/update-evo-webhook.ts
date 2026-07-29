/**
 * One-time script: Update all Evolution API instances' webhook URL
 * after a domain migration (e.g., whatsapp.hijabhani.online → app.clinicai.pk).
 *
 * Usage: npx tsx scripts/update-evo-webhook.ts
 */
import { db } from '../src/lib/db'
import { updateEvolutionWebhook } from '../src/lib/evolution'

async function main() {
  const webhookUrl = `${process.env.WHATSAPP_WEBHOOK_BASE_URL || 'https://app.clinicai.pk'}/api/webhooks/evolution`
  console.log(`Updating all Evolution instances to webhook: ${webhookUrl}`)

  const connections = await db.whatsAppConnection.findMany({
    where: { evoInstanceName: { not: '' } },
    select: { id: true, evoInstanceName: true, status: true, clinic: { select: { id: true, name: true } } },
  })

  console.log(`Found ${connections.length} WhatsApp connections with an Evolution instance`)

  let ok = 0
  let failed = 0

  for (const conn of connections) {
    if (!conn.evoInstanceName) continue
    try {
      const result = await updateEvolutionWebhook(conn.evoInstanceName, webhookUrl)
      if (result.ok) {
        ok++
        console.log(`  ✓ ${conn.clinic.name} (${conn.evoInstanceName}) → updated`)
      } else {
        failed++
        console.error(`  ✗ ${conn.clinic.name} (${conn.evoInstanceName}) → ${result.error}`)
      }
    } catch (err) {
      failed++
      console.error(`  ✗ ${conn.clinic.name} (${conn.evoInstanceName}) → ${err}`)
    }
  }

  console.log(`\nDone: ${ok} updated, ${failed} failed`)
  await db.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
