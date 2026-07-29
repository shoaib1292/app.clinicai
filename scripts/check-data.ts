import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const [a, p, s] = await Promise.all([db.appointment.count(), db.patient.count(), db.slot.count()])
  console.log(`Appointments: ${a}, Patients: ${p}, Slots: ${s}`)
  await db.$disconnect()
}
main()
