'use client'

import { cn } from '@/lib/utils'
import { Calendar, Clock, MapPin } from 'lucide-react'

interface AppointmentCardProps {
  appointment: {
    id: string
    start: string
    status: string
    doctorName: string
    doctorSpeciality: string
    tokenNo: number | null
    clinicName?: string
  }
  onClick?: () => void
}

const statusConfig: Record<string, { label: string; className: string }> = {
  booked: { label: 'Booked', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700 border-green-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
  no_show: { label: 'No Show', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  held: { label: 'On Hold', className: 'bg-purple-100 text-purple-700 border-purple-200' },
}

export function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const status = statusConfig[appointment.status] || { label: appointment.status, className: 'bg-muted text-muted-foreground border-border' }
  const date = new Date(appointment.start)
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: 'var(--portal-primary)' }}
          >
            Dr
          </div>
          <div>
            <h4 className="text-sm font-semibold">Dr. {appointment.doctorName}</h4>
            <p className="text-xs text-muted-foreground">{appointment.doctorSpeciality}</p>
          </div>
        </div>
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0', status.className)}>
          {status.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {dateStr}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {time}
        </span>
        {appointment.tokenNo && (
          <span className="flex items-center gap-1 font-semibold text-[var(--portal-primary)]">
            <MapPin className="w-3.5 h-3.5" />
            #{appointment.tokenNo}
          </span>
        )}
      </div>
    </button>
  )
}
