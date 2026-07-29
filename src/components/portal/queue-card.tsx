'use client'

import { cn } from '@/lib/utils'

interface QueueSlot {
  tokenNo: number
  status: string
  patientName?: string | null
}

export function QueueCard({
  currentToken,
  queueLength,
  estimatedWait,
  recentSlots,
}: {
  currentToken: number | null
  queueLength: number
  estimatedWait: string
  recentSlots: QueueSlot[]
}) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="p-5 pb-4" style={{ background: 'linear-gradient(135deg, var(--portal-primary), var(--portal-secondary))' }}>
        <h3 className="text-white/90 text-sm font-medium">Live Queue</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-bold text-white">
            {currentToken ? `#${currentToken}` : '—'}
          </span>
          <span className="text-white/70 text-sm">now serving</span>
        </div>
        <div className="flex gap-4 mt-3">
          <div>
            <p className="text-white/60 text-xs">In Queue</p>
            <p className="text-white font-semibold text-lg">{queueLength}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Est. Wait</p>
            <p className="text-white font-semibold text-lg">{estimatedWait}</p>
          </div>
        </div>
      </div>
      {recentSlots.length > 0 && (
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Recent Tokens</p>
          <div className="flex gap-2 overflow-x-auto">
            {recentSlots.map((s) => (
              <div
                key={s.tokenNo}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border',
                  s.status === 'booked'
                    ? 'bg-[var(--portal-primary-light)] text-[var(--portal-primary)] border-[var(--portal-primary)]/20'
                    : 'bg-muted text-muted-foreground border-border'
                )}
              >
                #{s.tokenNo}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
