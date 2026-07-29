'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CircleCheckIcon } from 'lucide-react'

const CalendarAppointmentBookingDemo = () => {
  const [date, setDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const timeSlots = Array.from({ length: 37 }, (_, i) => {
    const totalMinutes = i * 15
    const hour = Math.floor(totalMinutes / 60) + 9
    const minute = totalMinutes % 60

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  const today = new Date()
  const bookedDates = [
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
  ]

  return (
    <div>
      <Card className='gap-0 p-0'>
        <CardHeader className='flex h-max justify-center border-b p-4!'>
          <CardTitle>Schedule Your Visit</CardTitle>
        </CardHeader>
        <CardContent className='relative p-0 md:pr-48'>
          <div className='p-6 max-sm:flex max-sm:justify-center'>
            <Calendar
              mode='single'
              selected={date}
              onSelect={setDate}
              defaultMonth={date}
              disabled={[{ before: today }]}
              showOutsideDays={false}
              modifiers={{
                booked: bookedDates,
              }}
              modifiersClassNames={{
                booked: '[&>button]:line-through opacity-100 cursor-not-allowed',
              }}
              className='bg-transparent p-0 [--cell-size:--spacing(10)]'
              formatters={{
                formatWeekdayName: (date) => {
                  return date.toLocaleString('en-US', { weekday: 'short' })
                },
              }}
            />
          </div>
          <div className='inset-y-0 right-0 flex w-full flex-col gap-4 border-t max-md:h-60 md:absolute md:w-48 md:border-t-0 md:border-l'>
            <ScrollArea className='h-full'>
              <div className='flex flex-col gap-2 p-6'>
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(time)}
                    className='w-full shadow-none'
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4 border-t px-6 py-5! md:flex-row'>
          <div className='flex items-center gap-2 text-sm'>
            {date && selectedTime ? (
              <>
                <CircleCheckIcon className='size-5 stroke-green-600 dark:stroke-green-400' />
                <span>
                  Your appointment is confirmed for{' '}
                  <span className='font-medium'>
                    {date?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>{' '}
                  at <span className='font-medium'>{selectedTime}</span>.
                </span>
              </>
            ) : (
              <>Pick a date and time for your appointment.</>
            )}
          </div>
          <Button
            disabled={!date || !selectedTime}
            className='w-full md:ml-auto md:w-auto'
            variant='outline'
          >
            Book Appointment
          </Button>
        </CardFooter>
      </Card>
      <p className='text-muted-foreground mt-4 text-center text-xs' role='region'>
        ClinicAI · Smart appointment scheduling for Pakistani clinics
      </p>
    </div>
  )
}

export default CalendarAppointmentBookingDemo
