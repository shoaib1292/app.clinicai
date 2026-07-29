'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SlotData {
  id: string
  startTime: string
  tokenNo: number | null
  status: string
}

export function SlotPicker({
  slots,
  selectedSlotId,
  onSelect,
}: {
  slots: { date: string; slots: SlotData[] }[]
  selectedSlotId: string | null
  onSelect: (slot: SlotData) => void
}) {
  const [dateIndex, setDateIndex] = useState(0)

  const dates = slots.map((d) => d.date)
  const currentDate = dates[dateIndex]
  const currentSlots = slots[dateIndex]?.slots || []

  const dateLabel = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={dateIndex === 0}
          onClick={() => setDateIndex((i) => i - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <h3 className="text-sm font-semibold">{currentDate ? dateLabel(currentDate) : ''}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={dateIndex >= dates.length - 1}
          onClick={() => setDateIndex((i) => i + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {currentSlots.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">No available slots for this date</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {currentSlots.map((slot) => {
            const time = new Date(slot.startTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
            const isSelected = selectedSlotId === slot.id
            const unavailable = slot.status !== 'open'

            return (
              <button
                key={slot.id}
                disabled={unavailable}
                onClick={() => onSelect(slot)}
                className={cn(
                  'py-2.5 px-2 rounded-lg text-sm font-medium border transition-all active:scale-[0.97]',
                  isSelected
                    ? 'bg-[var(--portal-primary)] text-white border-transparent'
                    : unavailable
                      ? 'bg-muted text-muted-foreground cursor-not-allowed border-border opacity-50'
                      : 'bg-card border-border hover:border-[var(--portal-primary)] hover:text-[var(--portal-primary)]'
                )}
              >
                {time}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
