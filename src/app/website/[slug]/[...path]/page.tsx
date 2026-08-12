import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>
}) {
  const { slug, path } = await params

  // Try to find the clinic
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { id: true, slug: true },
  })
  if (!clinic) notFound()

  // Handle /doctor/<name> → redirect to /doctors if doctor exists
  if (path[0] === 'doctor' && path[1]) {
    const doctorName = decodeURIComponent(path[1]).replace(/-/g, ' ')
    const doctor = await db.doctor.findFirst({
      where: {
        clinicId: clinic.id,
        active: true,
        name: { contains: doctorName, mode: 'insensitive' },
      },
      select: { id: true, name: true },
    })
    if (doctor) {
      redirect(`/doctors`)
    }
    notFound()
  }

  // For any other unknown path, trigger 404
  notFound()
}
