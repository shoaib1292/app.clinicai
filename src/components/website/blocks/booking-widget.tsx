import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { Smartphone, Phone } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function BookingWidget({ clinic, content }: BlockProps) {
  const heading = content?.heading || 'Book Your Appointment'
  const subtitle = content?.subtitle || 'Skip the queue — schedule your visit online'

  return (
    <SectionWrapper bg="surface">
      <div className="max-w-lg mx-auto text-center">
        <SectionHeader badge="Book Now" heading={heading} subtitle={subtitle} />
        <FadeUp>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton href={`/p/${clinic.slug}/book`} variant="primary">
              <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Book Online</span>
            </CTAButton>
            {clinic.whatsappNumber && (
              <CTAButton href={`https://wa.me/${clinic.whatsappNumber.replace(/[^0-9]/g, '')}`} variant="secondary">
                <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> WhatsApp</span>
              </CTAButton>
            )}
          </div>
        </FadeUp>
        {clinic.phone && (
          <p className="mt-6 text-sm" style={{ color: 'var(--website-text-muted)' }}>
            Or call us at <a href={`tel:${clinic.phone}`} className="font-medium" style={{ color: 'var(--website-primary)' }}>{clinic.phone}</a>
          </p>
        )}
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'booking-widget', label: 'Booking Widget', category: 'booking', component: BookingWidget, defaultContent: {}, description: 'Centered booking CTA with online booking and WhatsApp options.', requiredData: ['clinic.slug'] })
export { BookingWidget }
