import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, clinicAdminNav, doctorNav, receptionistNav, type NavItem } from '@/components/dashboard-shell'
import { AppointmentDetailClient } from './appointment-detail-client'

export const metadata = { title: 'Appointment — ClinicAI' }

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!session.clinicId) redirect('/dashboard')
  if (session.type !== 'clinic_admin' && session.type !== 'doctor' && session.type !== 'receptionist') redirect('/dashboard')

  const { id } = await params
  const clinicId = session.clinicId

  const [clinic, appt] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    db.appointment.findFirst({
      where: { id, clinicId },
      include: {
        patient: { include: { familyMembers: true } },
        doctor: { select: { id: true, name: true, speciality: true, gender: true, currentStatus: true } },
        service: { select: { name: true, durationMin: true } },
        fees: true,
        slot: { select: { id: true, tokenNo: true, startTime: true, endTime: true } },
        reminders: { orderBy: { sendAt: 'asc' } },
        paymentProof: true,
        feedback: true,
      },
    }),
  ])
  if (!clinic) redirect('/login')
  if (!appt) redirect('/dashboard/appointments')

  // Fetch the family member this appointment is for (if any)
  let familyMember: { id: string; name: string; gender: string; relation: string } | null = null
  if (appt.familyMemberId) {
    familyMember = await db.patientFamilyMember.findFirst({
      where: { id: appt.familyMemberId, patientId: appt.patientId },
      select: { id: true, name: true, gender: true, relation: true },
    })
  }

  const nav: NavItem[] = session.type === 'doctor' ? doctorNav : session.type === 'receptionist' ? receptionistNav : clinicAdminNav

  // Fetch recent audit log entries for this appointment (action trail)
  const auditLogs = await db.auditLog.findMany({
    where: { target: id },
    orderBy: { ts: 'desc' },
    take: 10,
  })

  // Serialize dates for client component
  const serialized = {
    ...appt,
    start: appt.start.toISOString(),
    end: appt.end.toISOString(),
    checkInTime: appt.checkInTime?.toISOString() ?? null,
    createdAt: appt.createdAt.toISOString(),
    updatedAt: appt.updatedAt.toISOString(),
    patient: {
      ...appt.patient,
      createdAt: appt.patient.createdAt.toISOString(),
      updatedAt: appt.patient.updatedAt.toISOString(),
    },
    slot: appt.slot
      ? {
          ...appt.slot,
          startTime: appt.slot.startTime.toISOString(),
          endTime: appt.slot.endTime.toISOString(),
        }
      : null,
    reminders: appt.reminders.map((r) => ({
      ...r,
      sendAt: r.sendAt.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    paymentProof: appt.paymentProof
      ? {
          ...appt.paymentProof,
          createdAt: appt.paymentProof.createdAt.toISOString(),
          confirmedAt: appt.paymentProof.confirmedAt?.toISOString() ?? null,
          updatedAt: appt.paymentProof.updatedAt.toISOString(),
        }
      : null,
    feedback: appt.feedback
      ? {
          ...appt.feedback,
          createdAt: appt.feedback.createdAt.toISOString(),
        }
      : null,
    familyMember,
    auditLogs: auditLogs.map((a) => ({
      id: a.id,
      action: a.action,
      actorType: a.actorType,
      actorId: a.actorId,
      metadata: a.metadata,
      ts: a.ts.toISOString(),
    })),
  }

  return (
    <DashboardShell userType={session.type as 'clinic_admin' | 'doctor' | 'receptionist'} userName={session.name} clinicName={clinic.name} navItems={nav}>
      <AppointmentDetailClient appt={serialized} userType={session.type} />
    </DashboardShell>
  )
}
