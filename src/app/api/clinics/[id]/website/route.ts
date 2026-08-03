import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { invalidateHostnameCache } from '@/proxy'
import { revalidatePath } from 'next/cache'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { clinicId } = await requireClinicScope()
  if (clinicId !== id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true,
      websiteEnabled: true, themeId: true, templateId: true, brandColor: true,
      customDomain: true, customDomainVerified: true,
      tagline: true, description: true, socialLinks: true,
      heroImageUrl: true, aiGeneratedContent: true, sectionVisibility: true,
      headingFont: true, bodyFont: true, galleryImagesJson: true,
      blocksConfig: true,
      slug: true,
    },
  })
  if (!clinic) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    data: {
      ...clinic,
      aiGeneratedContent: clinic.aiGeneratedContent ? JSON.parse(clinic.aiGeneratedContent) : null,
      sectionVisibility: clinic.sectionVisibility ? JSON.parse(clinic.sectionVisibility) : null,
      socialLinks: clinic.socialLinks ? JSON.parse(clinic.socialLinks) : null,
      galleryImages: clinic.galleryImagesJson ? JSON.parse(clinic.galleryImagesJson) : null,
      blocksConfig: clinic.blocksConfig ? JSON.parse(clinic.blocksConfig) : null,
    },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { clinicId } = await requireClinicScope()
  if (clinicId !== id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    websiteEnabled, themeId, templateId, brandColor,
    customDomain, tagline, description, socialLinks,
    heroImageUrl, aiGeneratedContent, sectionVisibility,
    headingFont, bodyFont, galleryImages, blocksConfig,
  } = body

  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: {
      ...(websiteEnabled !== undefined && { websiteEnabled }),
      ...(themeId !== undefined && { themeId }),
      ...(templateId !== undefined && { templateId }),
      ...(brandColor !== undefined && { brandColor }),
      ...(customDomain !== undefined && { customDomain }),
      ...(tagline !== undefined && { tagline }),
      ...(description !== undefined && { description }),
      ...(headingFont !== undefined && { headingFont }),
      ...(bodyFont !== undefined && { bodyFont }),
      ...(socialLinks !== undefined && { socialLinks: typeof socialLinks === 'string' ? socialLinks : JSON.stringify(socialLinks) }),
      ...(heroImageUrl !== undefined && { heroImageUrl }),
      ...(aiGeneratedContent !== undefined && { aiGeneratedContent: typeof aiGeneratedContent === 'string' ? aiGeneratedContent : JSON.stringify(aiGeneratedContent) }),
      ...(sectionVisibility !== undefined && { sectionVisibility: typeof sectionVisibility === 'string' ? sectionVisibility : JSON.stringify(sectionVisibility) }),
      ...(galleryImages !== undefined && { galleryImagesJson: typeof galleryImages === 'string' ? galleryImages : JSON.stringify(galleryImages) }),
      ...(blocksConfig !== undefined && { blocksConfig: typeof blocksConfig === 'string' ? blocksConfig : JSON.stringify(blocksConfig) }),
    },
  })

  // Invalidate Redis hostname cache
  await invalidateHostnameCache(clinic.slug, clinic.customDomain)

  // Invalidate ISR cache
  try {
    revalidatePath(`/website/${clinic.slug}`)
    revalidatePath(`/website/${clinic.slug}/about`)
    revalidatePath(`/website/${clinic.slug}/doctors`)
    revalidatePath(`/website/${clinic.slug}/contact`)
  } catch {}

  return NextResponse.json({ ok: true, data: { slug: clinic.slug, websiteEnabled: clinic.websiteEnabled } })
}
