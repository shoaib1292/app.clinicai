import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { ClinicNotFound } from '@/components/website/clinic-not-found'

export default async function NotFound() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const pathname = headersList.get('x-invoke-path') || headersList.get('x-pathname') || ''
  const appDomain = process.env.APP_DOMAIN || 'app.clinicai.pk'
  const parentDomain = process.env.PARENT_DOMAIN || 'clinicai.pk'

  const hostname = host.replace(/:\d+$/, '')

  // Try to resolve a clinic from the hostname for clinic-themed 404
  let clinic: { id: string; name: string; slug: string; city: string | null; logoUrl: string | null; logoKey: string | null; brandColor: string | null; websiteEnabled: boolean } | null = null
  if (hostname !== appDomain && hostname !== parentDomain && hostname !== 'clinicai.pk') {
    // Check if this is a known clinic subdomain or custom domain
    for (const domain of [parentDomain, 'localhost']) {
      if (hostname.endsWith('.' + domain)) {
        const subdomain = hostname.split('.')[0]
        clinic = await db.clinic.findUnique({
          where: { slug: subdomain },
          select: {
            id: true, slug: true, name: true, city: true,
            logoUrl: true, logoKey: true, brandColor: true,
            websiteEnabled: true,
          },
        })
        if (clinic) break
      }
    }
    // Also check custom domains
    if (!clinic) {
      clinic = await db.clinic.findFirst({
        where: { customDomain: hostname },
        select: {
          id: true, slug: true, name: true, city: true,
          logoUrl: true, logoKey: true, brandColor: true,
          websiteEnabled: true,
        },
      })
    }
  }

  return <ClinicNotFound clinic={clinic} host={hostname} />
}
