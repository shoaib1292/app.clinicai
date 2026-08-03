import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { BrandingProvider } from '@/components/portal/branding-provider'
import { PortalLayout } from '@/components/portal/portal-layout'

export default async function PortalLayoutPage({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { id: true, name: true, logoUrl: true, brandingPrimaryColor: true, brandingSecondaryColor: true, patientPortalEnabled: true },
  })
  if (!clinic) notFound()

  return (
    <BrandingProvider clinic={clinic}>
      {children}
    </BrandingProvider>
  )
}
