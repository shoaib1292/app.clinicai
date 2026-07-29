"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select"
import { format } from "date-fns"

interface ChronoSelectProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  yearRange?: [number, number] // e.g. [2000, 2030]
}

/** Convert a `YYYY-MM-DD` ISO string (or null/empty) into a Date for ChronoSelect. */
export function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Convert a Date back into a `YYYY-MM-DD` ISO string (empty string when cleared). */
export function dateToIso(date: Date | undefined): string {
  if (!date) return ""
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${mo}-${d}`
}

export function ChronoSelect({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  yearRange = [1970, 2050],
}: ChronoSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Date | undefined>(value)
  const [month, setMonth] = React.useState<Date>(selected ?? new Date())

  // years array
  const years = React.useMemo(() => {
    const [start, end] = yearRange
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [yearRange])

  const handleSelect = (date: Date | undefined) => {
    setSelected(date)
    setOpen(false)
    onChange?.(date)
  }

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year)
    const newDate = new Date(month)
    newDate.setFullYear(newYear)
    setMonth(newDate)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[200px] justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 space-y-2 w-auto">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium">
            {format(month, "MMMM")}
          </span>
          <Select
            defaultValue={String(month.getFullYear())}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-7 w-[90px] text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )
}
