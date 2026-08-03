/**
 * WhatsApp Webhook Load Test (k6)
 *
 * Simulates many concurrent WhatsApp webhook deliveries.
 * This is important because:
 * - Evolution API sends webhooks in bursts (messages.upsert fires multiple times)
 * - Meta Cloud API can deliver multiple messages at once
 * - Each webhook triggers: filter, dedup, agent processing, DB writes
 *
 * Run: k6 run load-tests/whatsapp-webhook.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const WEBHOOK_PATH = __ENV.WEBHOOK_PATH || '/api/webhooks/evolution'

export const options = {
  stages: [
    { duration: '5s', target: 10 },   // Warm up
    { duration: '10s', target: 50 },  // Normal load
    { duration: '10s', target: 200 }, // Burst (many messages at once)
    { duration: '5s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<10000'], // Webhooks can take longer (agent processing)
  },
}

// Generate unique messages to simulate real WhatsApp traffic
function generateMessage(vuId, msgIndex) {
  const phoneNumber = `92300${String(100000 + vuId * 10 + msgIndex).padStart(7, '0')}`
  const messages = [
    'Mujhe appointment chahiye',
    'Aaj doctor available hain?',
    'Meri appointment cancel karni hai',
    'Fees kitni hai?',
    'Kal aana hai mujhe',
    'Hello, I need to book a slot',
    'Dr. Ahmed se milna hai',
    'Time kya hai clinic ka?',
    'Mera token number kya hai?',
    'Payment proof bhejni hai',
  ]
  const messageText = messages[Math.floor(Math.random() * messages.length)]

  return {
    messages: [
      {
        key: {
          remoteJid: `${phoneNumber}@s.whatsapp.net`,
          fromMe: false,
          id: `loadtest_${vuId}_${msgIndex}_${Date.now()}`,
        },
        message: {
          conversation: messageText,
        },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000),
      },
    ],
  }
}

export default function () {
  group('Webhook Delivery', () => {
    const payload = generateMessage(__VU, 0)

    const res = http.post(
      `${BASE_URL}${WEBHOOK_PATH}`,
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': __ENV.WEBHOOK_SECRET || 'test-secret',
        },
      }
    )

    check(res, {
      'webhook accepted': (r) => r.status === 200 || r.status === 202,
      'webhook not rejected': (r) => r.status !== 400 && r.status !== 401 && r.status !== 403,
    })
  })

  // Simulate the retry behavior: Evolution fires duplicate webhooks
  // This tests the dedup system under load
  group('Duplicate Webhook Delivery', () => {
    const payload = generateMessage(__VU, 1)

    // Send twice rapidly (simulates Evolution messages.upsert firing twice)
    for (let i = 0; i < 2; i++) {
      const res = http.post(
        `${BASE_URL}${WEBHOOK_PATH}`,
        JSON.stringify(payload),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': __ENV.WEBHOOK_SECRET || 'test-secret',
          },
        }
      )

      check(res, {
        'duplicate webhook handled': (r) => r.status === 200 || r.status === 202,
      })
    }
  })

  sleep(0.2)
}
