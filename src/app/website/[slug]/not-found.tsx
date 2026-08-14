import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { ClinicNotFound } from '@/components/website/clinic-not-found'

export default async function WebsiteNotFound() {
  const headersList = await headers()
  const pathname = headersList.get('x-invoke-path') || ''
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''

  // Extract slug from rewrite path: /website/<slug>/...
  const slug = pathname.match(/^\/website\/([^/]+)/)?.[1] || null

  let clinic: { id: string; name: string; slug: string; city: string | null; logoUrl: string | null; logoKey: string | null; brandColor: string | null; websiteEnabled: boolean } | null = null
  if (slug) {
    clinic = await db.clinic.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, city: true,
        logoUrl: true, logoKey: true, brandColor: true,
        websiteEnabled: true,
      },
    })
  }

  return <ClinicNotFound clinic={clinic} host={host} />
}
