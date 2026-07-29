/**
 * ClinicAI — Functional QA script (localhost)
 * Tests: double-booking guard, AI agent tool calling (book/cancel/reschedule),
 * AM/PM time parsing, 24h slot storage, and realtime (Redis->socket.io) delivery.
 *
 * Run: npx tsx scripts/test-functional.ts
 */
import { PrismaClient } from '@prisma/client'
import { executeTool } from '../src/lib/agent/execute-tool'
import { io as ioClient } from 'socket.io-client'

const db = new PrismaClient()

const CLINIC_ID = 'cmrrtj2gb0009vnqkenfru9ad' // Al-Shifa Family Clinic
const DOCTOR_ID = 'cmrrtj2kq000hvnqkr0rq2vq3' // Dr. Ahmed General
const PATIENT_PHONE = '03009998877'
const DATE = '2026-07-20'

const results: string[] = []
function log(name: string, ok: boolean, detail: string) {
  results.push(`${ok ? '✅' : '❌'} ${name} — ${detail}`)
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} — ${detail}`)
}

async function getOpenSlot(date: string): Promise<{ id: string; startTime: string } | null> {
  const slot = await db.slot.findFirst({
    where: { doctorId: DOCTOR_ID, clinicId: CLINIC_ID, date: new Date(Date.UTC(2026, 6, 20)), status: 'open' },
    orderBy: { startTime: 'asc' },
  })
  return slot ? { id: slot.id, startTime: slot.startTime } : null
}

async function main() {
  // ---------- 1. DOUBLE-BOOKING GUARD (via public API) ----------
  const slot = await getOpenSlot(DATE)
  if (!slot) { log('double-booking', false, 'no open slot found'); return }
  const body = JSON.stringify({ doctorId: DOCTOR_ID, slotId: slot.id, patientPhone: '03001112233', patientName: 'Dup Test' })
  const r1 = await fetch('http://localhost:8000/api/public/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  const j1 = await r1.json()
  if (!j1.ok) { log('double-booking first', false, JSON.stringify(j1)); return }
  log('double-booking first book', true, `appt ${j1.data.appointmentId}`)
  // second attempt on SAME slot
  const r2 = await fetch('http://localhost:8000/api/public/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  const j2 = await r2.json()
  const blocked = !j2.ok && (j2.error?.includes('not available') || j2.error?.includes('booked') || r2.status === 409)
  log('double-booking second attempt blocked', blocked, `status ${r2.status} :: ${JSON.stringify(j2).slice(0, 120)}`)

  // ---------- 2. REALTIME (subscribe, then trigger a booking) ----------
  const rtUrl = process.env.REALTIME_URL || 'http://localhost:3003'
  const socket = ioClient(rtUrl, { transports: ['websocket'] })
  let eventReceived: any = null
  await new Promise<void>((resolve) => {
    socket.on('connect', () => {
      socket.emit('subscribe', `clinic:${CLINIC_ID}:queue`)
      setTimeout(resolve, 400)
    })
    socket.on('event', (payload: any) => {
      if (payload?.channel === `clinic:${CLINIC_ID}:queue` && payload.message?.type === 'slot_booked') {
        eventReceived = payload.message
      }
    })
  })
  const slot2 = await getOpenSlot(DATE)
  if (slot2) {
    // grab a SECOND distinct open slot for reschedule BEFORE booking
    const slotB = await db.slot.findFirst({
      where: { doctorId: DOCTOR_ID, clinicId: CLINIC_ID, date: new Date(Date.UTC(2026, 6, 20)), status: 'open', id: { not: slot2.id } },
      orderBy: { startTime: 'asc' },
    })
    const ctx = { clinicId: CLINIC_ID, patientPhone: PATIENT_PHONE }
    const toolRes = await executeTool('book_appointment', {
      doctorId: DOCTOR_ID, slotId: slot2.id, patientPhone: PATIENT_PHONE, patientName: 'Realtime Test',
    }, ctx as any)
    const parsed = JSON.parse(toolRes)
    const gotEvent = await new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(!!eventReceived), 1500)
    })
    log('realtime slot_booked event', gotEvent, gotEvent ? `event appt ${eventReceived.appointmentId}` : 'no event within 1.5s')
    if (parsed.success) {
      // ---------- 4. AGENT RESCHEDULE TOOL (on the freshly-booked appt, BEFORE cancel) ----------
      if (slotB) {
        const reschRes = await executeTool('reschedule_appointment', {
          appointmentId: parsed.appointment.id, newSlotId: slotB.id,
        }, ctx as any)
        const rp = JSON.parse(reschRes)
        const newSlot = await db.slot.findUnique({ where: { id: slotB.id } })
        const oldSlot = await db.slot.findUnique({ where: { id: slot2.id } })
        log('agent reschedule_appointment', rp.success === true, `moved to ${slotB.startTime} (status ${newSlot?.status}), old ${slot2.startTime} (status ${oldSlot?.status})`)
      } else {
        log('agent reschedule_appointment', false, 'no second open slot available to reschedule to')
      }
      // ---------- 3. AGENT CANCEL TOOL (after reschedule) ----------
      const cancelRes = await executeTool('cancel_appointment', { appointmentId: parsed.appointment.id }, ctx as any)
      const cp = JSON.parse(cancelRes)
      const freed = await db.slot.findUnique({ where: { id: slot2.id } })
      log('agent cancel_appointment', cp.success === true, `cancelled ${parsed.appointment.id}, slot status now ${freed?.status}`)
    } else {
      log('agent book_appointment (realtime)', false, JSON.stringify(parsed).slice(0, 150))
    }
  }
  socket.close()

  // ---------- 5. AM/PM PARSING + 24h STORAGE ----------
  const slot4 = await getOpenSlot(DATE)
  if (slot4) {
    // book using a human "9:00 AM" style slotId to test normalization
    const amPmTime = `${parseInt(slot4.startTime.split(':')[0]) % 12 || 12}:${slot4.startTime.split(':')[1]} AM`
    const ctx2 = { clinicId: CLINIC_ID, patientPhone: '03007776665' }
    const r = await executeTool('book_appointment', {
      doctorId: DOCTOR_ID, slotId: amPmTime, patientPhone: '03007776665', patientName: 'AMPm Test', date: DATE,
    }, ctx2 as any)
    const p = JSON.parse(r)
    if (p.success) {
      const appt = await db.appointment.findUnique({ where: { id: p.appointment.id } })
      const storedTime = appt?.start ? new Date(appt.start).toISOString() : null
      log('agent AM/PM parsing -> book', true, `booked via "${amPmTime}", appt ${p.appointment.id}`)
      log('slot stored 24h', slot4.startTime.match(/^\d{2}:\d{2}$/) !== null, `slot.startTime=${slot4.startTime} (24h format expected)`)
    } else {
      log('agent AM/PM parsing -> book', false, JSON.stringify(p).slice(0, 150))
    }
  }

  console.log('\n===== SUMMARY =====')
  results.forEach((r) => console.log(r))
}

main().catch((e) => { console.error('TEST ERROR:', e); process.exit(1) }).finally(async () => { await db.$disconnect() })
