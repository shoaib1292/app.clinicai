// Sync ALL Prisma enums to PostgreSQL without dropping data
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const enums = [
  { name: 'AppointmentStatus', values: ['held','booked','confirmed','completed','cancelled','no_show','late_no_show','invalid'] },
  { name: 'Gender', values: ['male','female','unknown'] },
  { name: 'QueueMode', values: ['token','time','hybrid'] },
  { name: 'SlotStatus', values: ['open','held','booked','blocked'] },
  { name: 'PaymentProofStatus', values: ['pending','confirmed','rejected'] },
  { name: 'PaymentProofLedgerType', values: ['clinic_topup','patient_payment'] },
  { name: 'MessageDirection', values: ['in','out'] },
  { name: 'MessageType', values: ['text','image','audio','button','template','voice'] },
  { name: 'CampaignStatus', values: ['draft','scheduled','running','paused','completed','cancelled'] },
  { name: 'CreditLedgerType', values: ['debit','credit'] },
]

const columnMigrations = [
  { table: 'Appointment', column: 'status', enum: 'AppointmentStatus', default: 'booked' },
  { table: 'Doctor', column: 'gender', enum: 'Gender', default: 'male' },
  { table: 'Doctor', column: 'queueMode', enum: 'QueueMode', default: 'hybrid' },
  { table: 'Message', column: 'type', enum: 'MessageType', default: 'text' },
  { table: 'Patient', column: 'gender', enum: 'Gender', default: 'unknown' },
  { table: 'PatientFamilyMember', column: 'gender', enum: 'Gender', default: 'unknown' },
  { table: 'Slot', column: 'status', enum: 'SlotStatus', default: 'open' },
  { table: 'PaymentProof', column: 'status', enum: 'PaymentProofStatus', default: 'pending' },
  { table: 'PaymentProof', column: 'ledgerType', enum: 'PaymentProofLedgerType', default: null },
  { table: 'Message', column: 'direction', enum: 'MessageDirection', default: null },
  { table: 'CreditLedger', column: 'type', enum: 'CreditLedgerType', default: null },
  { table: 'Campaign', column: 'status', enum: 'CampaignStatus', default: 'draft' },
]

async function main() {
  console.log('Creating enum types...')
  for (const e of enums) {
    const values = e.values.map(v => `'${v}'`).join(', ')
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "${e.name}" AS ENUM (${values});
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    console.log(`  ✓ ${e.name}`)
  }

  console.log('\nMigrating columns to enum types...')
  for (const m of columnMigrations) {
    const table = `"${m.table}"`
    const col = `"${m.column}"`
    const enumType = `"${m.enum}"`
    
    let sql = `ALTER TABLE ${table} `
    if (m.default) {
      // Need to discover the actual default name first
      sql += `ALTER COLUMN ${col} DROP DEFAULT, `
    }
    sql += `ALTER COLUMN ${col} TYPE ${enumType} USING ${col}::text::${enumType}`
    if (m.default) {
      sql += `, ALTER COLUMN ${col} SET DEFAULT '${m.default}'::${enumType}`
    }
    sql += `;`

    await db.$executeRawUnsafe(sql)
    console.log(`  ✓ ${m.table}.${m.column} → ${m.enum}`)
  }

  console.log('\n✅ All enums synced successfully!')
}

main()
  .catch(e => { console.error('Failed:', e); process.exit(1) })
  .finally(() => db.$disconnect())
