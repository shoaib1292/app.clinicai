'use client'

import { SessionProvider } from 'next-auth/react'
import { PublicBookingClient } from './public-booking-client'

export function BookingSessionWrapper({
  children, clinic, doctors, services, preselectedDoctorId, preselectedServiceId
}: {
  children?: never
  clinic: Parameters<typeof PublicBookingClient>[0]['clinic']
  doctors: Parameters<typeof PublicBookingClient>[0]['doctors']
  services: Parameters<typeof PublicBookingClient>[0]['services']
  preselectedDoctorId: string
  preselectedServiceId: string
}) {
  return (
    <SessionProvider>
      <PublicBookingClient
        clinic={clinic}
        doctors={doctors}
        services={services}
        preselectedDoctorId={preselectedDoctorId}
        preselectedServiceId={preselectedServiceId}
      />
    </SessionProvider>
  )
}
