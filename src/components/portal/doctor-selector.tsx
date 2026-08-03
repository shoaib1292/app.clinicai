'use client'

import { Stethoscope, Video } from 'lucide-react'

interface Doctor {
  id: string
  name: string
  speciality: string
  gender: string
  currentStatus: string
  slotDurationMin: number
  canTelemedicine?: boolean
}

export function DoctorSelector({
  doctors,
  onSelect,
}: {
  doctors: Doctor[]
  onSelect: (doctorId: string) => void
}) {
  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No doctors available right now</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {doctors.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className="w-full text-left rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98] p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
              style={{ background: 'var(--portal-primary)' }}
            >
              {(d.name[0] || 'D').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold">Dr. {d.name}</h4>
              <p className="text-xs text-muted-foreground">{d.speciality}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {d.gender === 'female' ? 'Female' : d.gender === 'male' ? 'Male' : 'Any'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {d.slotDurationMin} min
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: d.currentStatus === 'in_clinic' ? 'var(--portal-primary-light)' : undefined,
                    color: d.currentStatus === 'in_clinic' ? 'var(--portal-primary)' : undefined,
                  }}
                >
                  {d.currentStatus === 'in_clinic' ? '● Available' : '○ Away'}
                </span>
                {d.canTelemedicine && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-0.5">
                    <Video className="w-2.5 h-2.5" /> Video
                  </span>
                )}
              </div>
            </div>
            <svg className="w-5 h-5 text-muted-foreground shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  )
}
