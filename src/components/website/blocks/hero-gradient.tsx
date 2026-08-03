import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { CountUp } from './shared/count-up'
import { GradientBlob } from './shared/gradient-blob'
import { StaggerContainer } from './shared/stagger-container'
import { EditableText } from './shared/editable-text'
import { resolveTemplate } from '@/lib/website-template-resolver'
import { getImageUrl } from '@/lib/image-url'
import { Stethoscope, MapPin, Phone } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function HeroGradient({ clinic, content }: BlockProps) {
  const headline = resolveTemplate(content?.headline || `Your Health, Our Priority at {{clinic.name}}`, clinic)
  const subheadline = resolveTemplate(
    content?.subheadline || `Expert medical care in {{clinic.city}} — led by {{doctor.primary.name}}`,
    clinic,
  )
  const ctaText = content?.ctaText || 'Book Appointment'
  const ctaLink = content?.ctaLink || `/p/${clinic.slug}/book`
  const secondaryText = content?.secondaryText || 'Call Now'
  const secondaryLink = content?.secondaryLink || (clinic.phone ? `tel:${clinic.phone}` : '#')
  const stats = clinic.clinicStats ? JSON.parse(clinic.clinicStats) : null

  return (
    <SectionWrapper bg="none" spacing="compact" className="relative min-h-[90vh] flex items-center overflow-hidden">
      <GradientBlob className="inset-x-0 -top-40 sm:-top-80" />
      <GradientBlob className="inset-x-0 top-[calc(100%-13rem)] sm:top-[calc(100%-30rem)]" />

      <div className="relative text-center max-w-4xl mx-auto">
        <FadeUp>
          {clinic.logoKey && (
            <img src={getImageUrl(clinic.logoKey, 100)} alt={clinic.name} className="h-12 w-auto mx-auto mb-8" />
          )}
        </FadeUp>

        <FadeUp delay={0.1}>
          <EditableText
            tagName="h1"
            value={headline}
            blockId="hero-gradient"
            fieldName="headline"
            className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-balance mb-6"
            style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}
          />
        </FadeUp>

        <FadeUp delay={0.2}>
          <EditableText
            tagName="p"
            value={subheadline}
            blockId="hero-gradient"
            fieldName="subheadline"
            className="text-base sm:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--website-text-muted)' }}
          />
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <CTAButton href={ctaLink} variant="primary">{ctaText}</CTAButton>
            {secondaryText && <CTAButton href={secondaryLink} variant="secondary">{secondaryText}</CTAButton>}
          </div>
        </FadeUp>

        {stats && (
          <StaggerContainer className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            {stats.yearsOfExperience && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--website-primary)' }}>
                  <CountUp end={Number(stats.yearsOfExperience)} suffix="+" />
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--website-text-muted)' }}>Years Exp.</div>
              </div>
            )}
            {stats.totalDoctors && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--website-primary)' }}>
                  <CountUp end={Number(stats.totalDoctors)} suffix="+" />
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--website-text-muted)' }}>Doctors</div>
              </div>
            )}
            {stats.totalPatients && (
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--website-primary)' }}>
                  <CountUp end={Number(stats.totalPatients)} suffix={Number(stats.totalPatients) >= 1000 ? 'K+' : '+'} />
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--website-text-muted)' }}>Patients</div>
              </div>
            )}
          </StaggerContainer>
        )}

        {clinic.city && (
          <FadeUp delay={0.4}>
            <div className="flex items-center justify-center gap-6 mt-12 text-xs" style={{ color: 'var(--website-text-muted)' }}>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{clinic.city}</span>
              {clinic.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{clinic.phone}</span>}
            </div>
          </FadeUp>
        )}
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'hero-gradient',
  label: 'Hero — Gradient',
  category: 'hero',
  component: HeroGradient,
  defaultContent: {},
  description: 'Full-screen gradient hero with animated stats and CTAs. Best for clinics with impressive numbers.',
  requiredData: ['clinic.name', 'clinic.slug'],
  manifest: {
    name: 'Premium Gradient Hero',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'multi'],
    tags: ['premium', 'gradient', 'stats', 'dark'],
    pairsWellWith: ['about-split', 'doctors-grid', 'services-grid', 'testimonials-cards', 'cta-banner'],
    visualWeight: 'heavy',
    contentDensity: 'balanced',
  },
})

export { HeroGradient }
