import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { generateBookingToken } from '@/lib/booking-token'

export const dynamic = 'force-dynamic'

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ clinicSlug: string; code: string }>
}) {
  const { clinicSlug, code } = await params

  const clinic = await db.clinic.findUnique({ where: { slug: clinicSlug }, select: { id: true } })
  if (!clinic) notFound()

  const refCode = await db.referralCode.findUnique({
    where: { code: code.toUpperCase() },
    select: { clinicId: true },
  })
  if (!refCode || refCode.clinicId !== clinic.id) notFound()

  const token = generateBookingToken(clinic.id)
  redirect(`/b/${token}?ref=${code.toUpperCase()}`)
}
