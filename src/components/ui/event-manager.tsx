"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
  Scissors,
  MapPin,
  Search,
  Loader2,
  Filter,
  X,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Event {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color?: string           // semantic: "blue" | "green" | "red" | "orange" | "purple" | "pink"
  category?: string        // "Consultation" | "Surgery" | "Follow-up" | "Personal"
  status?: string          // "booked" | "confirmed" | "completed" | "cancelled" | "no_show"
  attendees?: string[]
  tags?: string[]
  /** Extra metadata */
  phone?: string
  fee?: number
  tokenNo?: number | null
  operationNotes?: string | null
  location?: string
}

export interface EventManagerProps {
  events: Event[]
  loading?: boolean
  onEventClick?: (event: Event) => void
  onEventCreate?: (event: Omit<Event, "id">) => void
  onEventUpdate?: (id: string, event: Partial<Event>) => void
  onEventDelete?: (id: string) => void
  categories?: string[]
  availableTags?: string[]
  defaultView?: "month" | "week" | "day"
  providerName?: string
}

/* ------------------------------------------------------------------ */
/*  Status / Color Maps                                               */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { bg: string; border: string; dot: string; label: string; text: string }> = {
  booked:     { bg: "bg-brand-soft dark:bg-brand-soft", border: "border-l-brand", dot: "bg-brand", label: "Booked", text: "text-brand dark:text-brand" },
  confirmed:  { bg: "bg-green-50 dark:bg-green-950/30", border: "border-l-green-500", dot: "bg-green-500", label: "Confirmed", text: "text-green-700 dark:text-green-300" },
  completed:  { bg: "bg-gray-50 dark:bg-gray-900/30", border: "border-l-gray-400", dot: "bg-gray-400", label: "Completed", text: "text-gray-600 dark:text-gray-400" },
  cancelled:  { bg: "bg-red-50 dark:bg-red-950/20", border: "border-l-red-400", dot: "bg-red-400", label: "Cancelled", text: "text-red-600 dark:text-red-400" },
  no_show:    { bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-l-orange-400", dot: "bg-orange-400", label: "No-show", text: "text-orange-600 dark:text-orange-400" },
}

const CATEGORY_BADGES: Record<string, { label: string; cls: string }> = {
  consultation: { label: "Consult", cls: "bg-brand-soft text-brand dark:bg-brand-soft dark:text-brand" },
  surgery:      { label: "Surgery", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  followup:     { label: "Follow-up", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  operation:    { label: "Surgery", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
}

const EVENT_COLORS: Record<string, string> = {
  blue: "bg-brand-soft0", green: "bg-green-500", red: "bg-red-500",
  orange: "bg-orange-500", purple: "bg-purple-500", pink: "bg-pink-500",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function daysInMonth(month: number, year: number) { return new Date(year, month + 1, 0).getDate() }
function firstDayOfMonth(month: number, year: number) { return new Date(year, month, 1).getDay() }
function toDateStr(d: Date) { return d.toISOString().slice(0, 10) }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() }

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EventManager({
  events,
  loading = false,
  onEventClick,
  categories: categoryOpts,
  availableTags = [],
  defaultView = "month",
  providerName,
}: EventManagerProps) {
  const [view, setView] = useState<"month" | "week" | "day">(defaultView)
  const [baseDate, setBaseDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const today = useMemo(() => new Date(), [])

  // Apply filters
  const filteredEvents = useMemo(() => {
    let list = events
    if (filterCategory) {
      list = list.filter(e => (e.category ?? "").toLowerCase() === filterCategory.toLowerCase())
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.attendees?.some(a => a.toLowerCase().includes(q))
      )
    }
    return list
  }, [events, filterCategory, searchQuery])

  // Navigation
  const navTitle = useMemo(() => {
    if (view === "month") return `${MONTHS[baseDate.getMonth()]} ${baseDate.getFullYear()}`
    if (view === "week") {
      const start = new Date(baseDate)
      start.setDate(start.getDate() - start.getDay())
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return `${start.toLocaleDateString("en-PK", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`
    }
    return baseDate.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }, [view, baseDate])

  const navBack = () => {
    const d = new Date(baseDate)
    if (view === "month") d.setMonth(d.getMonth() - 1)
    else if (view === "week") d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setBaseDate(d)
  }
  const navFwd = () => {
    const d = new Date(baseDate)
    if (view === "month") d.setMonth(d.getMonth() + 1)
    else if (view === "week") d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setBaseDate(d)
  }
  const navToday = () => setBaseDate(new Date())

  function handleEventClick(e: Event) {
    setSelectedEvent(e)
    onEventClick?.(e)
  }

  // Get events for a specific day
  function getDayEvents(day: Date): Event[] {
    const ds = toDateStr(day)
    return filteredEvents.filter(e => toDateStr(e.startTime) === ds)
  }

  // Get events for a specific hour (day view)
  function getHourEvents(hour: number): Event[] {
    return filteredEvents.filter(e => {
      if (!isSameDay(e.startTime, baseDate)) return false
      return e.startTime.getHours() === hour
    })
  }

  // Get events for week columns
  function getWeekDayEvents(day: Date): Event[] {
    return getDayEvents(day).sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  // Discover unique categories from events
  const uniqueCategories = useMemo(() => {
    if (categoryOpts && categoryOpts.length > 0) return categoryOpts
    const cats = new Set(events.map(e => e.category ?? "Other").filter(Boolean))
    return Array.from(cats).sort()
  }, [events, categoryOpts])

  /* ===== Render ===== */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand" />
            {providerName ?? "My Schedule"}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList className="h-8">
              <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs px-3">Day</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={navToday} className="h-8 text-xs">
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={navBack} className="h-8 w-8">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[160px] text-center select-none">
              {navTitle}
            </span>
            <Button variant="ghost" size="icon" onClick={navFwd} className="h-8 w-8">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <button
            onClick={() => setFilterCategory(null)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              !filterCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                filterCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-brand" />
        </div>
      )}

      {/* ===== MONTH VIEW ===== */}
      {!loading && view === "month" && (
        <MonthView
          year={baseDate.getFullYear()}
          month={baseDate.getMonth()}
          today={today}
          getDayEvents={getDayEvents}
          onEventClick={handleEventClick}
        />
      )}

      {/* ===== WEEK VIEW ===== */}
      {!loading && view === "week" && (
        <WeekView
          baseDate={baseDate}
          today={today}
          getWeekDayEvents={getWeekDayEvents}
          onEventClick={handleEventClick}
        />
      )}

      {/* ===== DAY VIEW ===== */}
      {!loading && view === "day" && (
        <DayView
          baseDate={baseDate}
          today={today}
          getHourEvents={getHourEvents}
          onEventClick={handleEventClick}
        />
      )}

      {/* ===== Event Detail Dialog ===== */}
      <Dialog open={!!selectedEvent} onOpenChange={(o) => { if (!o) setSelectedEvent(null) }}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
        {Object.entries(STATUS_STYLES).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", val.dot)} />
            {val.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Sub-Components                                                     */
/* ================================================================== */

function MonthView({
  year, month, today, getDayEvents, onEventClick,
}: {
  year: number; month: number; today: Date
  getDayEvents: (d: Date) => Event[]
  onEventClick: (e: Event) => void
}) {
  const days = daysInMonth(month, year)
  const startDay = firstDayOfMonth(month, year)

  return (
    <Card className="overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-muted/30 border-b">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty leading cells */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="border-b border-r min-h-[100px] bg-muted/10" />
        ))}

        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const date = new Date(year, month, day)
          const isToday = isSameDay(date, today)
          const dayEvents = getDayEvents(date)

          return (
            <div
              key={day}
              className={cn(
                "border-b border-r p-1 min-h-[100px] transition-colors",
                isToday && "bg-brand/5"
              )}
            >
              <div className={cn(
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => {
                  const st = STATUS_STYLES[ev.status ?? ""]
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate transition-colors hover:shadow-sm",
                        st?.bg ?? "bg-gray-100",
                        st?.border ? `border-l-2 ${st.border}` : "border-l-2 border-l-transparent"
                      )}
                    >
                      <span className="font-medium">{ev.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                      {" "}{ev.title}
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Fill remaining cells to complete the grid */}
        {Array.from({ length: (7 - ((startDay + days) % 7)) % 7 }).map((_, i) => (
          <div key={`trail-${i}`} className="border-b border-r min-h-[100px] bg-muted/10" />
        ))}
      </div>
    </Card>
  )
}

function WeekView({
  baseDate, today, getWeekDayEvents, onEventClick,
}: {
  baseDate: Date; today: Date
  getWeekDayEvents: (d: Date) => Event[]
  onEventClick: (e: Event) => void
}) {
  const start = useMemo(() => {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - d.getDay())
    return d
  }, [baseDate])

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [start])

  const maxEvents = Math.max(...days.map(d => getWeekDayEvents(d).length), 0)

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {days.map((d, i) => {
          const isToday = isSameDay(d, today)
          return (
            <div key={i} className={cn("text-center py-2", isToday && "bg-brand/5")}>
              <div className="text-[11px] font-semibold text-muted-foreground">
                {d.toLocaleDateString("en-PK", { weekday: "short" })}
              </div>
              <div className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mt-0.5",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-7" style={{ minHeight: Math.max(200, maxEvents * 56 + 20) }}>
        {days.map((d, i) => {
          const isToday = isSameDay(d, today)
          const dayEvents = getWeekDayEvents(d)
          return (
            <div key={i} className={cn("border-r p-1.5", isToday && "bg-brand/5", i === 6 && "border-r-0")}>
              {dayEvents.length === 0 && (
                <div className="text-[10px] text-muted-foreground/30 italic mt-1">—</div>
              )}
              {dayEvents.map((ev) => {
                const st = STATUS_STYLES[ev.status ?? ""]
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={cn(
                      "w-full text-left px-1.5 py-1 rounded text-[10px] leading-tight mb-1 transition-colors hover:shadow-sm",
                      st?.bg ?? "bg-gray-100",
                      st?.border ? `border-l-2 ${st.border}` : "border-l-2 border-l-transparent"
                    )}
                  >
                    <span className="font-medium">{ev.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                    <div className="truncate">{ev.title}</div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function DayView({
  baseDate, today, getHourEvents, onEventClick,
}: {
  baseDate: Date; today: Date
  getHourEvents: (h: number) => Event[]
  onEventClick: (e: Event) => void
}) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6AM–10PM
  const isToday = isSameDay(baseDate, today)

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 bg-muted/20 border-b flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-brand" />
        <span className="text-sm font-semibold">
          {baseDate.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
        {isToday && <Badge variant="outline" className="text-[10px]">Today</Badge>}
      </div>

      <div className="divide-y max-h-[600px] overflow-y-auto scroll-thin">
        {hours.map((h) => {
          const hourEvents = getHourEvents(h)
          const isPast = h < today.getHours() && isToday
          const label = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`

          return (
            <div key={h} className={cn("flex min-h-[56px]", isPast && "opacity-30")}>
              <div className="w-16 shrink-0 text-[11px] text-muted-foreground px-3 py-2 font-medium">
                {label}
              </div>
              <div className="flex-1 py-0.5 pr-2 space-y-0.5">
                {hourEvents.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/20 italic px-2 py-1">—</div>
                ) : (
                  hourEvents.map((ev) => {
                    const st = STATUS_STYLES[ev.status ?? ""]
                    const cat = CATEGORY_BADGES[ev.category?.toLowerCase() ?? ""]
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onEventClick(ev)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-xs transition-all hover:shadow-sm",
                          st?.bg ?? "bg-gray-100",
                          st?.border ? `border-l-4 ${st.border}` : "border-l-4 border-l-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">{ev.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {cat && <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", cat.cls)}>{cat.label}</span>}
                            {st && <span className={cn("text-[10px] font-medium", st.text)}>{st.label}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {ev.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            {" – "}
                            {ev.endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                          {ev.fee && <span>PKR {ev.fee}</span>}
                          {ev.tokenNo && <span>Token #{ev.tokenNo}</span>}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function EventDetail({ event, onClose }: { event: Event; onClose: () => void }) {
  const st = STATUS_STYLES[event.status ?? ""]
  const cat = CATEGORY_BADGES[event.category?.toLowerCase() ?? ""]

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-4 h-4 text-brand" />
          {event.title}
          {cat && <Badge className={cat.cls}>{cat.label}</Badge>}
          {st && <Badge variant="outline" className="text-xs">{st.label}</Badge>}
        </DialogTitle>
        <DialogDescription>
          {event.startTime.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {event.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
          {" – "}
          {event.endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 text-sm">
        {event.description && (
          <p className="text-muted-foreground">{event.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-3">
          {event.attendees && event.attendees.length > 0 && (
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Attendees</div>
              <div className="mt-0.5">{event.attendees.join(", ")}</div>
            </div>
          )}
          {event.phone && (
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Phone</div>
              <div className="mt-0.5">{event.phone}</div>
            </div>
          )}
          {event.fee !== undefined && (
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Fee</div>
              <div className="mt-0.5 font-semibold">PKR {event.fee}</div>
            </div>
          )}
          {event.tokenNo !== null && event.tokenNo !== undefined && (
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Token</div>
              <div className="mt-0.5 font-semibold text-brand">#{event.tokenNo}</div>
            </div>
          )}
          {event.location && (
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Location</div>
              <div className="mt-0.5 flex items-center gap-1">
                <MapPin className="size-3" /> {event.location}
              </div>
            </div>
          )}
        </div>

        {event.operationNotes && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="font-medium text-red-700 dark:text-red-400 flex items-center gap-1.5 text-xs">
              <Scissors className="w-3.5 h-3.5" />
              Operation Notes
            </div>
            <div className="text-xs mt-1.5 whitespace-pre-wrap text-red-600 dark:text-red-300">
              {event.operationNotes}
            </div>
          </div>
        )}

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  )
}
