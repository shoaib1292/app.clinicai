import { SectionWrapper } from './shared/section-wrapper'
import { IconCircle } from './shared/icon-circle'
import { Phone, AlertCircle } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function CTAEmergency({ clinic, content }: BlockProps) {
  return (
    <SectionWrapper bg="none" spacing="compact">
      <div className="rounded-3xl p-8 md:p-12 text-center border-2 border-dashed"
        style={{ borderColor: 'var(--website-primary)', backgroundColor: 'var(--website-primary-light)' }}>
        <IconCircle size="lg" className="mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </IconCircle>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--website-text)' }}>
          {content?.heading || 'Need Urgent Care?'}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--website-text-muted)' }}>
          {content?.subtitle || `If this is an emergency, call ${clinic.name} immediately. We're here to help.`}
        </p>
        {clinic.phone && (
          <a href={`tel:${clinic.phone}`}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'var(--website-primary)', color: '#fff' }}>
            <Phone className="h-5 w-5" /> {clinic.phone}
          </a>
        )}
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'cta-emergency', label: 'Urgent Care CTA', category: 'booking', component: CTAEmergency, defaultContent: {}, description: 'Prominent emergency/urgent care block with large phone number.', requiredData: ['clinic.phone'] })
export { CTAEmergency }
