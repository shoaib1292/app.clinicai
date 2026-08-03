import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { CardBase } from './shared/card-base'
import { IconCircle } from './shared/icon-circle'
import { CTAButton } from './shared/cta-button'
import { Stethoscope, Clock } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function ServicesDetailed({ clinic, content }: BlockProps) {
  const services = clinic.services?.length
    ? clinic.services.slice(0, 10)
    : content?.items || []
  if (services.length === 0) return null

  return (
    <SectionWrapper bg="surface">
      <SectionHeader badge="Services" heading="Our Services &amp; Pricing" />
      <div className="space-y-4 max-w-3xl mx-auto">
        {services.map((s: any, i: number) => (
          <FadeUp key={i} delay={i * 0.08}>
            <CardBase padding="large" className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <IconCircle size="sm"><Stethoscope className="h-5 w-5" /></IconCircle>
                <div>
                  <h4 className="font-semibold" style={{ color: 'var(--website-text)' }}>{s.name}</h4>
                  <p className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{s.shortDescription}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {s.durationMin && (
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--website-text-muted)' }}>
                    <Clock className="h-4 w-4" /> {s.durationMin} min
                  </div>
                )}
                {s.fee > 0 && <span className="font-semibold" style={{ color: 'var(--website-primary)' }}>PKR {s.fee}</span>}
                <CTAButton href={`/p/${clinic.slug}/book`} variant="primary" className="text-xs h-9 px-4">Book</CTAButton>
              </div>
            </CardBase>
          </FadeUp>
        ))}
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'services-detailed', label: 'Services — Detailed', category: 'services', component: ServicesDetailed, defaultContent: {}, description: 'Detailed service cards with duration, pricing, and book CTA per row.', requiredData: [] })
export { ServicesDetailed }
