import { db } from '@/lib/db'
import { getTheme } from '@/components/website/theme-registry'
import { getTemplate } from '@/components/website/template-registry'
import { WebsiteLayout } from '@/components/website/website-layout'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

async function getClinicWebsiteData(slug: string) {
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      phone: true,
      whatsappNumber: true,
      address: true,
      logoUrl: true,
      brandColor: true,
      tagline: true,
      description: true,
      heroImageUrl: true,
      socialLinks: true,
      aiGeneratedContent: true,
      sectionVisibility: true,
      themeId: true,
      templateId: true,
    },
  })
  if (!clinic) return null
  return {
    ...clinic,
    aiGeneratedContent: clinic.aiGeneratedContent ? JSON.parse(clinic.aiGeneratedContent) : null,
    socialLinks: clinic.socialLinks,
    sectionVisibility: clinic.sectionVisibility ? JSON.parse(clinic.sectionVisibility) : null,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const clinic = await getClinicWebsiteData(slug)
  if (!clinic) return { title: 'Not Found' }

  const seo = clinic.aiGeneratedContent?.seo

  return {
    title: seo?.title || clinic.name,
    description: seo?.description || clinic.tagline,
    robots: seo?.robots || 'index, follow',
    alternates: seo?.canonical ? { canonical: seo.canonical } : undefined,
    openGraph: {
      title: seo?.openGraph?.title || clinic.name,
      description: seo?.openGraph?.description,
      images: clinic.heroImageUrl ? [{ url: clinic.heroImageUrl }] : [],
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
    other: seo?.schemaOrg ? {
      'application/ld+json': JSON.stringify(seo.schemaOrg),
    } : undefined,
  }
}

export default async function WebsiteLayoutPage({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const clinic = await getClinicWebsiteData(slug)
  if (!clinic) notFound()

  const theme = getTheme(clinic.themeId || 'modern')
  const brandColor = clinic.brandColor || '#0891b2'

  return (
    <div
      style={{
        ...theme.cssVariables,
        '--website-primary': brandColor,
        '--website-primary-light': `color-mix(in srgb, ${brandColor} 10%, transparent)`,
        fontFamily: 'var(--website-font)',
      } as React.CSSProperties}
      className="min-h-screen flex flex-col"
    >
      {children}
    </div>
  )
}
