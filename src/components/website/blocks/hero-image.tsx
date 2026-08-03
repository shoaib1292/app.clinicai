'use client'
import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { getImageUrl } from '@/lib/image-url'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function HeroImage({ clinic, content }: BlockProps) {
  const headline = content?.headline || clinic.tagline || `Welcome to ${clinic.name}`
  const subheadline = content?.subheadline || clinic.description || 'Your trusted healthcare partner'
  const imageKey = clinic.heroImageKey || clinic.heroImageKey
  const ctaText = content?.ctaText || 'Book Appointment'
  const ctaLink = content?.ctaLink || `/p/${clinic.slug}/book`

  return (
    <SectionWrapper bg="none" spacing="compact" className="relative min-h-[90vh] flex items-center overflow-hidden p-0 max-w-none">
      <div className="absolute inset-0">
        {imageKey ? (
          <>
            <img src={getImageUrl(imageKey, 1400)} alt={clinic.name}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          </>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: 'var(--website-primary)' }} />
        )}
      </div>

      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <FadeUp>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6"
                style={{ fontFamily: 'var(--website-font-heading)' }}>
                {headline}
              </h1>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="text-base sm:text-xl text-white/80 mb-10">{subheadline}</p>
            </FadeUp>
            <FadeUp delay={0.2}>
              <div className="flex flex-wrap gap-4">
                <CTAButton href={ctaLink} variant="primary" className="bg-white! text-black! hover:bg-white/90!">
                  {ctaText}
                </CTAButton>
                {clinic.phone && (
                  <CTAButton href={`tel:${clinic.phone}`} variant="outline"
                    className="border-white/30! text-white! hover:bg-white/10!">
                    {clinic.phone}
                  </CTAButton>
                )}
              </div>
            </FadeUp>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'hero-image',
  label: 'Hero — Full Image',
  category: 'hero',
  component: HeroImage,
  defaultContent: {},
  description: 'Full-width hero with a hero image background. Best impact with a high-quality clinic photo.',
  requiredData: ['clinic.name', 'clinic.heroImageKey'],
})

export { HeroImage }
