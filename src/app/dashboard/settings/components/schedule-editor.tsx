'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type Break = { start: string; end: string }
export type DayHours = { start: string; end: string; breaks: Break[] }
export type WorkingHours = Partial<Record<DayKey, DayHours>>

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const DEFAULT_DAY: DayHours = { start: '09:00', end: '17:00', breaks: [{ start: '13:00', end: '14:00' }] }

function parseWorkingHours(raw: string | null | undefined): WorkingHours {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as WorkingHours) : {}
  } catch {
    return {}
  }
}

export function ScheduleEditor({
  hours,
  onChange,
}: {
  hours: WorkingHours
  onChange: (next: WorkingHours) => void
}) {
  function update(next: WorkingHours) {
    onChange(next)
  }

  function toggleDay(key: DayKey) {
    const next = { ...hours }
    if (next[key]) {
      delete next[key]
    } else {
      next[key] = { ...DEFAULT_DAY, breaks: [{ start: '', end: '' }] }
    }
    update(next)
  }

  function setDay(key: DayKey, patch: Partial<DayHours>) {
    if (!hours[key]) return
    update({ ...hours, [key]: { ...hours[key]!, ...patch } })
  }

  function setBreak(key: DayKey, bi: number, patch: Partial<Break>) {
    const day = hours[key]
    if (!day) return
    const breaks = day.breaks.map((b, i) => (i === bi ? { ...b, ...patch } : b))
    setDay(key, { breaks })
  }

  function addBreak(key: DayKey) {
    const day = hours[key]
    if (!day) return
    setDay(key, { breaks: [...day.breaks, { start: '', end: '' }] })
  }

  function removeBreak(key: DayKey, bi: number) {
    const day = hours[key]
    if (!day) return
    setDay(key, { breaks: day.breaks.filter((_, i) => i !== bi) })
  }

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const entry = hours[key]
        const isOff = !entry
        return (
          <div key={key} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => toggleDay(key)}
              >
                {isOff ? <><Plus className="w-3 h-3 mr-1" /> Set Hours</> : <><X className="w-3 h-3 mr-1" /> Off</>}
              </Button>
            </div>
            {entry && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Start
                    </Label>
                    <Input
                      type="time"
                      value={entry.start}
                      className="border-emerald-200 dark:border-emerald-800"
                      onChange={(e) => setDay(key, { start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> End
                    </Label>
                    <Input
                      type="time"
                      value={entry.end}
                      className="border-emerald-200 dark:border-emerald-800"
                      onChange={(e) => setDay(key, { end: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1 border border-amber-200 dark:border-amber-800 rounded-md p-2 bg-amber-50/50 dark:bg-amber-950/20">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Breaks
                  </Label>
                  {entry.breaks.map((b, bi) => (
                    <div key={bi} className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={b.start}
                        className="h-7 text-xs"
                        onChange={(e) => setBreak(key, bi, { start: e.target.value })}
                      />
                      <span className="text-xs">to</span>
                      <Input
                        type="time"
                        value={b.end}
                        className="h-7 text-xs"
                        onChange={(e) => setBreak(key, bi, { end: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeBreak(key, bi)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => addBreak(key)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Break
                  </Button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function WorkingHoursTab({
  clinicId,
  initialValue,
}: {
  clinicId: string
  initialValue: string | null
}) {
  const [hours, setHours] = useState<WorkingHours>(() => parseWorkingHours(initialValue))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingHours: hours }),
      })
      const json = await res.json()
      if (!json.ok) {
        toast.error(json.error || 'Failed to save working hours')
        return
      }
      toast.success('Working hours saved')
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Clinic Working Hours</h2>
        <p className="text-sm text-muted-foreground">Set your clinic&apos;s default availability and breaks. These act as the base schedule; a doctor&apos;s own weekly hours override them per day.</p>
      </div>
      <ScheduleEditor hours={hours} onChange={setHours} />
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Working Hours
        </Button>
      </div>
    </div>
  )
}
