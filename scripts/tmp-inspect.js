const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
;(async () => {
  const rows = await db.$queryRawUnsafe(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_name IN ('PricingRule','Clinic','Appointment','AppointmentFees','Invoice','Service')
    ORDER BY table_name, ordinal_position
  `)
  for (const r of rows) console.log(r.table_name, '|', r.column_name)
  await db.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
