/**
 * ClinicAI Realtime Mini-Service — Socket.io server
 * Port 3003 (fixed; do not use env PORT)
 *
 * Tenant-scoped channels:
 *   clinic:{clinicId}:queue          — slot_booked, slot_cancelled, patient_checked_in, token_called
 *   clinic:{clinicId}:ops            — doctor_status_changed, agent_escalated
 *   clinic:{clinicId}:conversations  — message_received, conversation_updated
 *   doctor:{doctorId}                — status_changed, new_appointment
 *
 * Frontend connects via: io("/?XTransformPort=3003")
 * (Caddy gateway routes the XTransformPort=3003 query to this service.)
 *
 * The HTTP API routes also publish to channels via the in-memory store's
 * publish() method. Since the Next.js app and this service run in separate
 * processes, we use a simple HTTP webhook from the Next.js app to this service
 * to broadcast events. (In production with Redis, both would use Redis pub/sub.)
 */
import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// In-memory subscriber registry (this service is the single source of truth for connected clients)
const channelSubscribers = new Map<string, Set<string>>() // channel -> Set<socketId>

function getSubs(channel: string): Set<string> {
  if (!channelSubscribers.has(channel)) channelSubscribers.set(channel, new Set())
  return channelSubscribers.get(channel)!
}

io.on('connection', (socket) => {
  console.log(`[realtime] connected: ${socket.id}`)

  // Client subscribes to a channel
  socket.on('subscribe', (channel: string) => {
    if (typeof channel !== 'string' || !channel) return
    socket.join(channel)
    getSubs(channel).add(socket.id)
    console.log(`[realtime] ${socket.id} subscribed to ${channel}`)
  })

  socket.on('unsubscribe', (channel: string) => {
    if (typeof channel !== 'string') return
    socket.leave(channel)
    getSubs(channel)?.delete(socket.id)
  })

  // HTTP webhook from Next.js app → broadcast to subscribers
  // (POST body: { channel, message })
  socket.on('broadcast', (data: { channel: string; message: unknown }) => {
    if (!data?.channel) return
    io.to(data.channel).emit('event', { channel: data.channel, message: data.message, ts: Date.now() })
    console.log(`[realtime] broadcast to ${data.channel}:`, JSON.stringify(data.message).slice(0, 100))
  })

  socket.on('disconnect', () => {
    console.log(`[realtime] disconnected: ${socket.id}`)
    for (const [channel, subs] of channelSubscribers.entries()) {
      subs.delete(socket.id)
    }
  })

  socket.on('error', (err) => console.error(`[realtime] socket error ${socket.id}:`, err))
})

// HTTP endpoint for the Next.js app to broadcast events to this service
// (workaround for cross-process pub/sub without Redis)
const httpApp = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const { channel, message } = JSON.parse(body)
        if (channel) {
          io.to(channel).emit('event', { channel, message, ts: Date.now() })
          console.log(`[realtime] HTTP broadcast to ${channel}:`, JSON.stringify(message).slice(0, 100))
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: String(e) }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, connections: io.engine.clientsCount, channels: channelSubscribers.size }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Not found' }))
  }
})

// Replace the httpServer's request handler with our app
httpServer.removeAllListeners('request')
httpServer.on('request', httpApp.emit.bind(httpApp, 'request'))

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[ClinicAI Realtime] Socket.io server listening on port ${PORT}`)
  console.log(`[ClinicAI Realtime] Frontend connects via: io("/?XTransformPort=3003")`)
  console.log(`[ClinicAI Realtime] HTTP broadcast endpoint: POST http://localhost:${PORT}/broadcast`)
  console.log(`[ClinicAI Realtime] Health check: GET http://localhost:${PORT}/health`)
})

process.on('SIGTERM', () => {
  console.log('[ClinicAI Realtime] SIGTERM received, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[ClinicAI Realtime] SIGINT received, shutting down...')
  httpServer.close(() => process.exit(0))
})
