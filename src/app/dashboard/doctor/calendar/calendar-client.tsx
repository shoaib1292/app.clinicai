'use client'

import { useState, useEffect, useCallback } from 'react'
import { EventManager, type Event } from '@/components/ui/event-manager'

interface Appt {
  id: string
  start: string
  end: string
  status: string
  type: string | null
  operationNotes: string | null
  patient: { name: string | null; phone: string }
  service: { name: string; isSurgery: boolean } | null
  slot: { tokenNo: number | null; startTime: string } | null
  doctorFee: number
  totalFee: number
}

function apptToEvent(a: Appt): Event {
  const categoryMap: Record<string, string> = {
    consultation: 'Consultation',
    operation: 'Surgery',
    followup: 'Follow-up',
  }

  return {
    id: a.id,
    title: a.patient.name || 'Unknown Patient',
    description: a.service?.name ?? 'No service',
    startTime: new Date(`${a.start.slice(0, 10)}T${a.slot?.startTime || '00:00'}:00`),
    endTime: new Date(`${a.start.slice(0, 10)}T${a.end?.slice(11, 16) || '00:30'}:00`),
    category: categoryMap[a.type ?? ''] ?? 'Consultation',
    status: a.status,
    attendees: a.patient.name ? [a.patient.name] : [],
    phone: a.patient.phone,
    fee: a.totalFee,
    tokenNo: a.slot?.tokenNo ?? null,
    operationNotes: a.operationNotes,
    tags: [a.type ?? 'consultation', a.status].filter(Boolean),
  }
}

export function DoctorCalendar({
  doctorId, doctorName, clinicId, slotDuration,
}: {
  doctorId: string; doctorName: string; clinicId: string; slotDuration: number
}) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAppts = useCallback(async (from: string, to: string) => {
    setLoading(true)
    const res = await fetch(`/api/appointments?doctorId=${doctorId}&from=${from}&to=${to}&limit=200`)
    const json = await res.json()
    if (json.ok) setEvents((json.data as Appt[]).map(apptToEvent))
    setLoading(false)
  }, [doctorId])

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
    fetchAppts(start.toISOString(), end.toISOString())
  }, [fetchAppts])

  // Real-time refresh
  useEffect(() => {
    const channel = `clinic:${clinicId}:queue`
    const unsub = (window as any).__storeSubscribe?.(channel, () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
      fetchAppts(start.toISOString(), end.toISOString())
    })
    return () => unsub?.()
  }, [fetchAppts, clinicId])

  return (
    <EventManager
      events={events}
      loading={loading}
      providerName={`${doctorName} · ${slotDuration}min slots`}
      defaultView="month"
      categories={['Consultation', 'Surgery', 'Follow-up']}
      availableTags={['consultation', 'surgery', 'followup', 'booked', 'confirmed', 'completed', 'cancelled', 'no_show']}
    />
  )
}
