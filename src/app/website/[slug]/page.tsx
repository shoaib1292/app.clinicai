import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { WebsiteLayout } from '@/components/website/website-layout'
import { getBlock } from '@/components/website/blocks/registry'
import '@/components/website/blocks/register-all'
import type { ClinicWebsiteData, BlockConfig } from '@/components/website/blocks/types'

export const revalidate = 300
export const dynamicParams = true

async function getClinicWebsiteData(slug: string): Promise<ClinicWebsiteData | null> {
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: {
      id: true, slug: true, name: true, city: true, phone: true,
      whatsappNumber: true, address: true, logoKey: true, logoUrl: true,
      brandColor: true, tagline: true, description: true,
      heroImageKey: true, heroImageUrl: true, socialLinks: true,
      headingFont: true, bodyFont: true,
      galleryImagesJson: true, clinicStats: true,
      blocksConfig: true,
      latitude: true, longitude: true, googleMapsUrl: true,
    },
  })
  if (!clinic) return null

  const doctors = await db.doctor.findMany({
    where: { clinicId: clinic.id, active: true, displayOnWebsite: true },
    select: { id: true, name: true, speciality: true, qualifications: true, imageKey: true, bio: true, languages: true },
    take: 20,
  })

  return {
    ...clinic,
    doctors,
    galleryImages: clinic.galleryImagesJson ? JSON.parse(clinic.galleryImagesJson) : [],
  } as ClinicWebsiteData
}

export default async function WebsiteHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await getClinicWebsiteData(slug)
  if (!clinic) notFound()

  // Parse block config from DB
  let blocksConfig: BlockConfig[] = []
  if (clinic.blocksConfig) {
    try { blocksConfig = JSON.parse(clinic.blocksConfig) } catch { /* keep empty */ }
  }

  // If no blocks configured, use a sensible default
  if (blocksConfig.length === 0) {
    blocksConfig = [
      { blockId: 'hero-gradient', order: 0, visible: true, content: {} },
      { blockId: 'about-split', order: 1, visible: true, content: {} },
      { blockId: 'doctors-grid', order: 2, visible: true, content: {} },
      { blockId: 'services-grid', order: 3, visible: true, content: {} },
      { blockId: 'cta-banner', order: 4, visible: true, content: {} },
      { blockId: 'contact-cards', order: 5, visible: true, content: {} },
      { blockId: 'footer', order: 6, visible: true, content: {} },
    ]
  }

  // Render active blocks in order
  const activeBlocks = blocksConfig
    .filter(b => b.visible !== false)
    .sort((a, b) => a.order - b.order)
    .map(config => {
      const definition = getBlock(config.blockId)
      if (!definition) return null
      const BlockComponent = definition.component
      const mergedContent = { ...definition.defaultContent, ...config.content }
      return (
        <BlockComponent
          key={`${config.blockId}-${config.order}`}
          clinic={clinic}
          content={mergedContent}
          visual={config.visual}
        />
      )
    })
    .filter(Boolean)

  return (
    <WebsiteLayout clinic={clinic}>
      {activeBlocks}
    </WebsiteLayout>
  )
}
