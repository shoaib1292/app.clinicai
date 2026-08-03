import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { EditableText } from './shared/editable-text'
import { Phone } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function CTABanner({ clinic, content }: BlockProps) {
  return (
    <SectionWrapper bg="none" spacing="compact" className="relative overflow-hidden">
      <div className="rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center relative overflow-hidden"
        style={{ backgroundColor: 'var(--website-primary)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <FadeUp>
            <EditableText
              tagName="h2"
              value={content?.heading || `Ready to Visit ${clinic.name}?`}
              blockId="cta-banner"
              fieldName="heading"
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--website-font-heading)' }}
            />
          </FadeUp>
          <FadeUp delay={0.1}>
            <EditableText
              tagName="p"
              value={content?.subtitle || 'Schedule your appointment today — we\'re here when you need us.'}
              blockId="cta-banner"
              fieldName="subtitle"
              className="text-white/80 mb-8"
            />
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="flex flex-wrap justify-center gap-4">
              <CTAButton href={`/p/${clinic.slug}/book`} variant="primary" className="bg-white! text-black! hover:bg-white/90!">Book Appointment</CTAButton>
              {clinic.phone && (
                <CTAButton href={`tel:${clinic.phone}`} variant="outline" className="border-white/30! text-white! hover:bg-white/10!">
                  <Phone className="h-4 w-4 mr-2 inline" /> {clinic.phone}
                </CTAButton>
              )}
            </div>
          </FadeUp>
        </div>
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'cta-banner', label: 'CTA Banner', category: 'booking', component: CTABanner, defaultContent: {},
  description: 'Full-width brand-color gradient CTA with book and phone buttons.',
  requiredData: ['clinic.name', 'clinic.slug'],
  manifest: {
    name: 'Booking CTA Banner',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'gynae', 'pediatric', 'multi'],
    tags: ['conversion', 'booking', 'gradient', 'action'],
    pairsWellWith: ['hero-gradient', 'doctors-grid', 'services-grid', 'testimonials-cards'],
    visualWeight: 'heavy',
    contentDensity: 'minimal',
  },
})
export { CTABanner }
