import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { StaggerContainer } from './shared/stagger-container'
import { CardBase } from './shared/card-base'
import { IconCircle } from './shared/icon-circle'
import { MapPin, Phone, Smartphone, CalendarDays } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function ContactCards({ clinic }: BlockProps) {
  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Contact" heading="Get in Touch" />
      <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinic.address && (
          <CardBase hover className="text-center">
            <div className="flex justify-center mb-4"><IconCircle size="lg"><MapPin className="h-6 w-6" /></IconCircle></div>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>Our Location</h4>
            <p className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{clinic.address}</p>
            {clinic.city && <p className="text-xs mt-1" style={{ color: 'var(--website-text-muted)' }}>{clinic.city}</p>}
          </CardBase>
        )}
        {clinic.phone && (
          <CardBase hover className="text-center">
            <div className="flex justify-center mb-4"><IconCircle size="lg"><Phone className="h-6 w-6" /></IconCircle></div>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>Phone</h4>
            <a href={`tel:${clinic.phone}`} className="text-sm font-medium" style={{ color: 'var(--website-primary)' }}>{clinic.phone}</a>
          </CardBase>
        )}
        {clinic.whatsappNumber && (
          <CardBase hover className="text-center">
            <div className="flex justify-center mb-4"><IconCircle size="lg"><Smartphone className="h-6 w-6" /></IconCircle></div>
            <h4 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>WhatsApp</h4>
            <a href={`https://wa.me/${clinic.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium" style={{ color: 'var(--website-primary)' }}>Chat Now</a>
          </CardBase>
        )}
        <CardBase hover className="text-center">
          <div className="flex justify-center mb-4"><IconCircle size="lg"><CalendarDays className="h-6 w-6" /></IconCircle></div>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>Book Online</h4>
          <a href={`/p/${clinic.slug}/book`} className="text-sm font-medium" style={{ color: 'var(--website-primary)' }}>Schedule Appointment</a>
        </CardBase>
      </StaggerContainer>
    </SectionWrapper>
  )
}

registerBlock({ id: 'contact-cards', label: 'Contact Cards', category: 'info', component: ContactCards, defaultContent: {}, description: 'Icon cards for address, phone, WhatsApp, and online booking.', requiredData: ['clinic.name'] })
export { ContactCards }
