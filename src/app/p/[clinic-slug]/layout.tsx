import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { BrandingProvider } from '@/components/portal/branding-provider'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ 'clinic-slug': string }>
}) {
  const { 'clinic-slug': slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      brandingPrimaryColor: true,
      brandingSecondaryColor: true,
      patientPortalEnabled: true,
    },
  })

  if (!clinic || !clinic.patientPortalEnabled) notFound()

  return (
    <BrandingProvider clinic={clinic}>
      {children}
    </BrandingProvider>
  )
}
