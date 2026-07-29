import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PublicBookingClient } from './public-booking-client'

export const metadata = { title: 'Book Appointment — ClinicAI' }

export default async function PublicBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Decode token: base64(clinicId:doctorId:serviceId)
  let clinicId = '', doctorId = '', serviceId = ''
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    clinicId = parts[0] || ''
    doctorId = parts[1] || ''
    serviceId = parts[2] || ''
  } catch {
    notFound()
  }

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

  return <PublicBookingClient clinic={clinic} doctors={doctors} services={services} preselectedDoctorId={doctorId} preselectedServiceId={serviceId} />
}
