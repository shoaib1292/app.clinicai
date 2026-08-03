import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { BrandingProvider } from '@/components/portal/branding-provider'

// Google Fonts CSS2 URLs for the fonts the website builder offers
const GOOGLE_FONTS: Record<string, string> = {
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap',
  'Geist': 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap',
  'DM Sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap',
  'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
}

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
      // Website builder brand — portal mirrors it so both feel the same
      brandColor: true,
      headingFont: true,
      bodyFont: true,
    },
  })

  if (!clinic) notFound()

  // Server-side font <link> tags (safe — no client React rendering involved)
  const fontLinks = [...new Set([clinic.headingFont, clinic.bodyFont])]
    .filter((f): f is string => !!f && !!GOOGLE_FONTS[f])
    .map(f => GOOGLE_FONTS[f])

  return (
    <>
      {fontLinks.map(href => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <BrandingProvider clinic={clinic}>
        {children}
      </BrandingProvider>
    </>
  )
}
