/**
 * Public Booking Page Load Test (k6)
 *
 * Simulates burst traffic hitting the public booking page.
 * This represents real-world scenarios like:
 * - Morning rush (patients booking for the day)
 * - After a clinic promotion (social media spike)
 * - Friday/Saturday peak hours
 *
 * Run: k6 run load-tests/public-booking.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const CLINIC_ID = __ENV.CLINIC_ID || ''

export const options = {
  stages: [
    { duration: '2s', target: 20 },   // Quick ramp to 20 users
    { duration: '5s', target: 100 },  // Surge to 100 (burst)
    { duration: '10s', target: 200 }, // Peak burst
    { duration: '5s', target: 50 },   // Settle
    { duration: '3s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],     // Less than 2% errors
    http_req_duration: ['p(95)<3000'],  // 95% under 3s for page loads
  },
}

export default function () {
  group('Public Booking Page', () => {
    // Load the main booking page
    const res = http.get(`${BASE_URL}/book`, {
      tags: { page: 'booking-landing' },
    })

    check(res, {
      'booking page loaded': (r) => r.status === 200,
      'page renders HTML': (r) => r.headers['Content-Type'] &&
        (r.headers['Content-Type'].includes('text/html') ||
         r.headers['content-type']?.includes('text/html')),
    })
  })

  group('Available Slots API', () => {
    // List available slots — this is the heaviest API call during booking
    const today = new Date().toISOString().slice(0, 10)
    const payload = JSON.stringify({
      doctorId: '',
      date: today,
    })

    const res = http.post(
      `${BASE_URL}/api/slots/available`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    )

    check(res, {
      'slots API responded': (r) => r.status === 200,
      'slots response is JSON': (r) => r.headers['Content-Type']?.includes('json'),
    })
  })

  group('Doctor List API', () => {
    const res = http.get(`${BASE_URL}/api/doctors`)

    check(res, {
      'doctors API responded': (r) => r.status === 200,
    })
  })

  sleep(0.5)
}
