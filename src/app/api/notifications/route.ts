import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType } from '@/lib/session'
import { ok, handle } from '@/lib/api'

// GET /api/notifications?clinicId=&userType=
// Returns a unified list of actionable notifications:
//  - Pending payment proofs (payment)
//  - Active conversations awaiting response (conversation)
//  - Overdue reminders (reminder)
//  - Today's upcoming appointments (appointment)
async function list(req: NextRequest) {
  const url = new URL(req.url)
  const userType = url.searchParams.get('userType') || 'clinic_admin'

  let clinicId: string | null = null
  let isPlatformUser = false

  try {
    if (userType === 'platform_admin' || userType === 'platform_staff') {
      await requireType('platform_admin', 'platform_staff')
      isPlatformUser = true
      clinicId = url.searchParams.get('clinicId') // optional filter
    } else {
      const scope = await requireClinicScope()
      clinicId = scope.clinicId
    }
  } catch {
    return ok([])
  }

  const notifications: Array<{
    id: string
    type: 'payment' | 'conversation' | 'reminder' | 'appointment' | 'system'
    title: string
    description: string
    href?: string
    ts: Date
    read: boolean
  }> = []

  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // 1. Pending payment proofs
  const pendingProofs = await db.paymentProof.findMany({
    where: {
      status: 'pending',
      ...(clinicId ? { clinicId } : {}),
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { clinic: { select: { name: true } } },
  })
  for (const p of pendingProofs) {
    notifications.push({
      id: `proof-${p.id}`,
      type: 'payment',
      title: `Payment proof pending: PKR ${p.amount}`,
      description: `${p.payerName} · ${p.ledgerType === 'clinic_topup' ? 'Clinic top-up' : 'Patient payment'}${p.clinic && !clinicId ? ` · ${p.clinic.name}` : ''}`,
      href: isPlatformUser ? '/dashboard/finance/proofs' : '/dashboard/payments',
      ts: p.createdAt,
      read: false,
    })
  }

  // 2. Active conversations (only for clinic-scoped users)
  if (clinicId && !isPlatformUser) {
    const activeConvos = await db.conversation.findMany({
      where: { clinicId, status: 'active' },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { patient: true },
    })
    for (const c of activeConvos) {
      notifications.push({
        id: `convo-${c.id}`,
        type: 'conversation',
        title: `Active chat: ${c.patient.name || c.patient.phone}`,
        description: c.summary || c.lastIntent || 'New conversation',
        href: `/dashboard/conversations/${c.id}`,
        ts: c.updatedAt,
        read: false,
      })
    }
  }

  // 3. Overdue reminders (only for clinic-scoped users)
  if (clinicId && !isPlatformUser) {
    const overdueReminders = await db.reminder.findMany({
      where: {
        sendAt: { lt: now },
        status: 'pending',
        appointment: { clinicId },
      },
      take: 5,
      orderBy: { sendAt: 'asc' },
      include: { appointment: { include: { patient: true } } },
    })
    for (const r of overdueReminders) {
      notifications.push({
        id: `reminder-${r.id}`,
        type: 'reminder',
        title: `Overdue reminder: ${r.type.replace('reminder_', '')}`,
        description: `${r.appointment.patient.name || r.appointment.patient.phone} · was due ${new Date(r.sendAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`,
        href: '/dashboard/reminders',
        ts: r.sendAt,
        read: false,
      })
    }
  }

  // 4. Today's upcoming appointments (clinic-scoped only)
  if (clinicId && !isPlatformUser) {
    const upcoming = await db.appointment.findMany({
      where: {
        clinicId,
        start: { gte: now, lt: todayEnd },
        status: 'booked',
      },
      take: 5,
      orderBy: { start: 'asc' },
      include: { patient: true, doctor: true },
    })
    for (const a of upcoming) {
      const inHours = Math.floor((a.start.getTime() - now.getTime()) / (1000 * 60 * 60))
      notifications.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        title: `Upcoming: ${a.patient.name || a.patient.phone}`,
        description: `${a.doctor.name} at ${new Date(a.start).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })} · in ${inHours}h`,
        href: '/dashboard/appointments',
        ts: a.start,
        read: false,
      })
    }
  }

  // Sort by timestamp descending
  notifications.sort((a, b) => b.ts.getTime() - a.ts.getTime())

  return ok(notifications)
}

export const GET = handle(list)
