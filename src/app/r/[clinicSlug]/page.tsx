import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { generateBookingToken } from '@/lib/booking-token'

export const dynamic = 'force-dynamic'

export default async function ReferralSlugPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>
}) {
  const { clinicSlug } = await params

  const clinic = await db.clinic.findUnique({ where: { slug: clinicSlug }, select: { id: true } })
  if (!clinic) notFound()

  const token = generateBookingToken(clinic.id)
  redirect(`/b/${token}`)
}
