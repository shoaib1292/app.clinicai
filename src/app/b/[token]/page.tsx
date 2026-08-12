import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PublicBookingClient } from './public-booking-client'
import { verifyBookingToken } from '@/lib/booking-token'

export const metadata = { title: 'Book Appointment — ClinicAI' }

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { token } = await params
  const { ref: refCode } = await searchParams

  // Verify JWT booking token or fallback to legacy base64
  const decoded = verifyBookingToken(token)
  if (!decoded) notFound()
  const { clinicId, doctorId, serviceId } = { clinicId: decoded.clinicId, doctorId: decoded.doctorId ?? '', serviceId: decoded.serviceId ?? '' }

  const clinic = await db.clinic.findUnique({ where: { id: clinicId } })
  if (!clinic) notFound()

  const doctors = await db.doctor.findMany({
    where: {
      clinicId,
      active: true,
      ...(doctorId ? { id: doctorId } : {}),
    },
    include: { services: true },
  })

  const services = await db.service.findMany({
    where: {
      clinicId,
      active: true,
      ...(serviceId ? { id: serviceId } : {}),
    },
  })

  return <PublicBookingClient clinic={clinic} doctors={doctors} services={services} preselectedDoctorId={doctorId} preselectedServiceId={serviceId} initialRefCode={refCode || undefined} />
}
