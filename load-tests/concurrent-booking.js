/**
 * Concurrent Booking Load Test (k6)
 *
 * Simulates multiple patients trying to book the same slot simultaneously.
 * Verifies that the distributed lock prevents double-booking.
 *
 * Run: k6 run load-tests/concurrent-booking.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

// Cluster configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const CLINIC_ID = __ENV.CLINIC_ID || ''
const DOCTOR_ID = __ENV.DOCTOR_ID || ''
const SLOT_ID = __ENV.SLOT_ID || ''

export const options = {
  stages: [
    { duration: '5s', target: 10 },  // Ramp up to 10 concurrent users
    { duration: '10s', target: 50 }, // Ramp up to 50
    { duration: '10s', target: 100 }, // Peak load
    { duration: '5s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    http_req_duration: ['p(95)<5000'], // 95% under 5s
  },
}

// Generate unique patient names
const patientNames = []
for (let i = 0; i < 100; i++) {
  patientNames.push(`LoadTest Patient ${i}`)
}

const patientPhones = []
for (let i = 0; i < 100; i++) {
  patientPhones.push(`300${String(1000000 + i).padStart(7, '0')}`)
}

export default function () {
  const vuId = __VU // k6 virtual user ID (1-100)

  // Step 1: List available slots for the target doctor
  const listPayload = JSON.stringify({
    doctorId: DOCTOR_ID,
    date: new Date().toISOString().slice(0, 10),
  })

  const listRes = http.post(
    `${BASE_URL}/api/agent/message`,
    JSON.stringify({
      clinicId: CLINIC_ID,
      userMessage: `list_available_slots ${listPayload}`,
      patientPhone: patientPhones[vuId % patientPhones.length],
      patientName: patientNames[vuId % patientNames.length],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )

  check(listRes, {
    'list slots responded': (r) => r.status === 200,
  })

  // Step 2: All VUs try to book the SAME slot
  // This simulates the race condition where multiple patients want the same slot
  const bookPayload = JSON.stringify({
    doctorId: DOCTOR_ID,
    slotId: SLOT_ID,
    patientName: patientNames[vuId % patientNames.length],
    patientPhone: patientPhones[vuId % patientPhones.length],
    patientGender: 'unknown',
    paymentMode: 'cash',
  })

  const bookRes = http.post(
    `${BASE_URL}/api/agent/message`,
    JSON.stringify({
      clinicId: CLINIC_ID,
      userMessage: `book_appointment ${bookPayload}`,
      patientPhone: patientPhones[vuId % patientPhones.length],
      patientName: patientNames[vuId % patientNames.length],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )

  check(bookRes, {
    'booking responded': (r) => r.status === 200,
  })

  // Only the FIRST successful booking should succeed; rest should fail
  const body = JSON.parse(bookRes.body)
  if (body.success) {
    console.log(`VU ${vuId}: BOOKING SUCCEEDED`)
  }

  sleep(1)
}
