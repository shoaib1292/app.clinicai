/**
 * ClinicAI — Future Slots Seeder
 * Generates open booking slots for the back-half of July + August 2026
 * so patients can book future dates through the public booking page.
 *
 * Safe: does NOT delete anything. Only creates open slots for the given range.
 * Past data (June, July 1-26) is left untouched.
 *
 * Run: npx tsx scripts/seed-future-slots.ts
 */
import { PrismaClient } from '@prisma/client'
import { generateSlotsForDoctorDate } from '../src/lib/schedule'

const db = new PrismaClient()

// Date ranges to generate (UTC months are 0-indexed: 6 = July, 7 = August)
const RANGES: { month: number; from: number; to: number }[] = [
  { month: 6, from: 27, to: 31 }, // July 27-31, 2026
  { month: 7, from: 1, to: 20 }, //  August 1-20, 2026
]

async function main() {
  const doctors = await db.doctor.findMany({
    where: { active: true },
    select: { id: true, name: true, clinicId: true },
  })
  if (doctors.length === 0) {
    console.log('No active doctors found — run the base seed first.')
    return
  }

  let total = 0
  for (const range of RANGES) {
    const monthName = new Date(Date.UTC(2026, range.month, 1)).toLocaleString('en-US', { month: 'long' })
    for (let day = range.from; day <= range.to; day++) {
      const date = new Date(Date.UTC(2026, range.month, day))
      for (const doc of doctors) {
        try {
          const slots = await generateSlotsForDoctorDate(doc.id, date)
          total += slots.length
        } catch (e) {
          // skip days the doctor has no schedule for
        }
      }
    }
    console.log(`✅ ${monthName} ${range.from}-${range.to}: slots generated`)
  }

  console.log(`\n🎉 Done. ${total} future slots created across ${doctors.length} doctors.`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
