'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

/**
 * Hook to subscribe to a ClinicAI realtime channel via the Socket.io mini-service.
 * The gateway (Caddy) routes /?XTransformPort=3003 to the realtime service.
 *
 * Usage:
 *   const { lastEvent, connected } = useRealtime(`clinic:${clinicId}:queue`)
 *   useEffect(() => {
 *     if (lastEvent?.message?.type === 'slot_booked') { refresh() }
 *   }, [lastEvent])
 */
export function useRealtime(channel: string | null) {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<{ channel: string; message: unknown; ts: number } | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!channel) return
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('subscribe', channel)
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('event', (ev: { channel: string; message: unknown; ts: number }) => {
      if (ev.channel === channel) setLastEvent(ev)
    })

    return () => {
      socket.emit('unsubscribe', channel)
      socket.disconnect()
      socketRef.current = null
    }
  }, [channel])

  return { connected, lastEvent }
}

/**
 * Broadcast an event to a channel via the realtime service HTTP endpoint.
 * Used by API routes (server-side) to notify connected dashboard clients.
 */
export async function broadcastEvent(channel: string, message: unknown) {
  try {
    await fetch('/api/realtime/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, message }),
    })
  } catch (e) {
    console.error('[realtime] broadcast failed:', e)
  }
}
