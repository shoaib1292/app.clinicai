import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { FeedbackFormClient } from './feedback-form-client'

export const metadata = { title: 'Rate Your Visit — ClinicAI' }

export default async function PublicFeedbackPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params

  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, status: true, start: true, end: true,
      clinicId: true,
      patient: { select: { id: true, name: true, preferredLanguage: true } },
      doctor: { select: { id: true, name: true, speciality: true, gender: true } },
      service: { select: { name: true } },
      clinic: { select: { name: true, city: true } },
      feedback: { select: { id: true } },
    },
  })
  if (!appt) notFound()
  if (appt.status !== 'completed') {
    // Only completed appointments can be rated
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 text-3xl">!</div>
          <h1 className="text-xl font-bold mb-2">Feedback not available</h1>
          <p className="text-sm text-muted-foreground">Feedback can only be submitted for completed appointments.</p>
        </div>
      </div>
    )
  }

  if (appt.feedback) {
    // Already submitted — show thank you page
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-card rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Shukriya!</h1>
          <p className="text-sm text-muted-foreground">Aap ka feedback mil gaya. We appreciate your time.</p>
        </div>
      </div>
    )
  }

  return (
    <FeedbackFormClient
      appointment={{
        id: appt.id,
        clinicName: appt.clinic.name,
        doctorName: appt.doctor.name,
        doctorSpeciality: appt.doctor.speciality,
        serviceName: appt.service?.name ?? null,
        patientName: appt.patient.name ?? null,
        date: appt.start.toISOString(),
      }}
    />
  )
}
