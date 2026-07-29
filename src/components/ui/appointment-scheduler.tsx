"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Stethoscope,
  Loader2,
  CheckCircle2,
  Search,
  ArrowRight,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AvailableDate {
  date: number        // day of month (1-31)
  hasSlots: boolean
  isPast?: boolean
  isFullyBooked?: boolean
}

export interface TimeSlot {
  time: string        // "09:00" (24h)
  available: boolean
  label?: string      // optional display text
  token?: number | null // queue token number shown alongside the time
}

export interface AppointmentSchedulerProps {
  /** Clinic / doctor name shown in the header */
  providerName?: string
  providerLocation?: string
  /** Show the built-in provider header (name + location). Set false when the
   *  parent surface already displays the provider name to avoid duplication. */
  showHeader?: boolean
  /** Currently selected month/year */
  year?: number
  month?: number       // 0-based (0 = January)
  /** Dates in this month that have availability */
  availableDates?: AvailableDate[]
  /** Time slots for the selected date */
  timeSlots?: TimeSlot[]
  /** Currently selected date (day of month) */
  selectedDate?: number | null
  selectedTime?: string | null
  loading?: boolean
  onDateSelect?: (day: number) => void
  onTimeSelect?: (time: string) => void
  onMonthChange?: (month: number, year: number) => void
  onBook?: () => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay()
}

// Convert "14:30" (24h) to "2:30 PM" (12h, Pakistan-friendly)
function format12h(time: string): string {
  const [hStr, mStr] = time.split(":") as [string, string]
  let hour = parseInt(hStr, 10)
  const minute = mStr ?? "00"
  const meridiem = hour >= 12 ? "PM" : "AM"
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${minute} ${meridiem}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AppointmentScheduler({
  providerName = "ClinicAI",
  providerLocation,
  showHeader = true,
  year: yearProp,
  month: monthProp,
  availableDates = [],
  timeSlots = [],
  selectedDate: selectedDateProp,
  selectedTime: selectedTimeProp,
  loading = false,
  onDateSelect,
  onTimeSelect,
  onMonthChange,
  onBook,
}: AppointmentSchedulerProps) {
  const today = useMemo(() => new Date(), [])
  const [localMonth, setLocalMonth] = useState(monthProp ?? today.getMonth())
  const [localYear, setLocalYear] = useState(yearProp ?? today.getFullYear())
  const [localSelectedDate, setLocalSelectedDate] = useState<number | null>(
    selectedDateProp ?? null
  )
  const [localSelectedTime, setLocalSelectedTime] = useState<string | null>(
    selectedTimeProp ?? null
  )
  const [searchQuery, setSearchQuery] = useState("")

  // Use controlled values when provided
  const month = monthProp ?? localMonth
  const year = yearProp ?? localYear
  const selectedDate = selectedDateProp ?? localSelectedDate
  const selectedTime = selectedTimeProp ?? localSelectedTime

  const daysInCurrentMonth = daysInMonth(month, year)
  const startDay = firstDayOfMonth(month, year)

  // Build a quick lookup for available dates
  const availabilityMap = useMemo(() => {
    const map = new Map<number, AvailableDate>()
    for (const d of availableDates) map.set(d.date, d)
    return map
  }, [availableDates])

  // Group slots by morning / afternoon / evening
  const groupedSlots = useMemo(() => {
    const morning: TimeSlot[] = []
    const afternoon: TimeSlot[] = []
    const evening: TimeSlot[] = []

    for (const s of timeSlots) {
      const hour = parseInt(s.time.split(":")[0], 10)
      if (hour < 12) morning.push(s)
      else if (hour < 17) afternoon.push(s)
      else evening.push(s)
    }

    const groups: { label: string; slots: TimeSlot[] }[] = []
    if (morning.length) groups.push({ label: "Morning", slots: morning })
    if (afternoon.length) groups.push({ label: "Afternoon", slots: afternoon })
    if (evening.length) groups.push({ label: "Evening", slots: evening })
    return groups
  }, [timeSlots])

  // Filter slots by the user's search query (time like "2 pm", "14", or token "#4")
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/[#]/g, "")
    if (!q) return groupedSlots
    return groupedSlots
      .map((g) => ({
        ...g,
        slots: g.slots.filter((s) => {
          const time12 = format12h(s.time).toLowerCase()
          const time24 = s.time.toLowerCase()
          const token = s.token != null ? String(s.token) : ""
          return (
            time12.includes(q) ||
            time24.includes(q) ||
            token.includes(q)
          )
        }),
      }))
      .filter((g) => g.slots.length > 0)
  }, [groupedSlots, searchQuery])

  // All slots selected?
  const canBook = selectedDate !== null && selectedTime !== null && !loading

  function handlePrevMonth() {
    let m = month - 1
    let y = year
    if (m < 0) { m = 11; y-- }
    setLocalMonth(m)
    setLocalYear(y)
    setLocalSelectedDate(null)
    setLocalSelectedTime(null)
    onMonthChange?.(m, y)
  }

  function handleNextMonth() {
    let m = month + 1
    let y = year
    if (m > 11) { m = 0; y++ }
    setLocalMonth(m)
    setLocalYear(y)
    setLocalSelectedDate(null)
    setLocalSelectedTime(null)
    onMonthChange?.(m, y)
  }

  function handleDateClick(day: number) {
    setLocalSelectedDate(day)
    setLocalSelectedTime(null)
    onDateSelect?.(day)
  }

  function handleTimeClick(time: string) {
    setLocalSelectedTime(time)
    onTimeSelect?.(time)
  }

  const selectedDateObj = selectedDate
    ? new Date(year, month, selectedDate)
    : null
  const formattedDate = selectedDateObj
    ? selectedDateObj.toLocaleDateString("en-PK", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : ""

  const availableCount = timeSlots.filter((s) => s.available).length

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      {showHeader && (
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-6 h-6 text-brand-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{providerName}</h1>
          {providerLocation && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {providerLocation}
            </p>
          )}
        </div>
      )}

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-[380px_1fr] divide-x divide-border md:h-[460px] md:overflow-hidden">
            {/* ========== LEFT: Calendar ========== */}
            <div className="p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold">
                  {MONTHS[month]} {year}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[11px] font-medium text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells before first day */}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                  const day = i + 1
                  const info = availabilityMap.get(day)
                  const isAvailable = availableDates.length === 0 ? true : (info?.hasSlots ?? false)
                  const isPast = info?.isPast ?? new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  const isSelected = selectedDate === day
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear()

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isAvailable || isPast}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "relative h-9 w-full rounded-lg text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
                        // Selected
                        isSelected &&
                          "bg-primary text-primary-foreground shadow-sm",
                        // Today (not selected)
                        isToday &&
                          !isSelected &&
                          "ring-1 ring-brand/40",
                        // Available
                        isAvailable &&
                          !isSelected &&
                          !isPast &&
                          "hover:bg-brand/10 hover:text-brand cursor-pointer text-foreground",
                        // Unavailable
                        (!isAvailable || isPast) &&
                          "text-muted-foreground/35 cursor-not-allowed",
                      )}
                    >
                      {day}
                      {/* Dot indicator */}
                      {isAvailable && !isSelected && !isPast && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/25" />
                  Unavailable
                </span>
              </div>
            </div>

            {/* ========== RIGHT: Time Slots ========== */}
            <div className="p-5 min-h-[350px] flex flex-col md:min-h-0 md:overflow-hidden">
              {!selectedDate ? (
                /* Empty state — no date selected */
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Clock className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Select a date</p>
                  <p className="text-xs mt-1">
                    Choose an available date on the calendar to see time slots.
                  </p>
                </div>
              ) : loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                </div>
              ) : timeSlots.length === 0 ? (
                /* No slots available */
                <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Clock className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No slots available</p>
                  <p className="text-xs mt-1">
                    {formattedDate} has no available time slots. Try another
                    date.
                  </p>
                </div>
              ) : (
                /* Available slots */
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="mb-3">
                    <h2 className="text-sm font-semibold">{formattedDate}</h2>
                    <p className="text-xs text-muted-foreground">
                      {availableCount} slot{availableCount !== 1 ? "s" : ""} available
                    </p>
                  </div>

                  {/* Slot search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search time or token (e.g. 2 PM or #4)"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-4 scroll-thin pr-1">
                    {filteredGroups.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                        <Search className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">No slots match “{searchQuery}”.</p>
                      </div>
                    ) : (
                      filteredGroups.map((group) => (
                      <div key={group.label}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider px-2 py-0"
                          >
                            {group.label}
                          </Badge>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 min-w-0">
                          {group.slots.map((slot) => {
                            const isSelected = selectedTime === slot.time
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => handleTimeClick(slot.time)}
                                className={cn(
                                  "relative flex flex-col items-center justify-center text-center px-2 py-2.5 rounded-lg text-sm transition-all min-w-0 break-words",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
                                  isSelected &&
                                    "bg-primary text-primary-foreground shadow-sm",
                                  slot.available &&
                                    !isSelected &&
                                    "border border-border hover:border-brand/50 hover:bg-accent/30 cursor-pointer text-foreground",
                                  !slot.available &&
                                    "border border-border/40 text-muted-foreground/30 cursor-not-allowed line-through",
                                )}
                              >
                                {slot.token != null && (
                                  <span className={cn(
                                    "text-[10px] font-semibold leading-none mb-0.5 px-1.5 py-0.5 rounded-full",
                                    isSelected ? "bg-primary-foreground/20" : "bg-brand/10 text-brand",
                                  )}>
                                    #{slot.token}
                                  </span>
                                )}
                                <span className="font-semibold leading-tight">{slot.label ?? format12h(slot.time)}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                    )}
                  </div>

                  {/* Book button */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <Button
                      className="w-full h-10"
                      disabled={!canBook}
                      onClick={onBook}
                    >
                      {canBook ? (
                        <>
                          Continue with {format12h(selectedTime!)}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Select a time slot
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Powered by{" "}
        <span className="font-medium text-brand">ClinicAI</span> · 24/7 AI
        receptionist
      </p>
    </div>
  )
}
