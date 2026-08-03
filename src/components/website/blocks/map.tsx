import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function MapBlock({ clinic }: BlockProps) {
  const lat = clinic.latitude
  const lng = clinic.longitude
  if (!lat || !lng) return null

  return (
    <SectionWrapper bg="default" spacing="compact">
      <SectionHeader badge="Location" heading="Find Us" />
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--website-border)' }}>
        <iframe
          width="100%" height="400" style={{ border: 0 }}
          loading="lazy" referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?q=${lat},${lng}&zoom=16&maptype=roadmap`}
          title={`${clinic.name} Location`}
        />
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'map', label: 'Google Map', category: 'info', component: MapBlock, defaultContent: {}, description: 'Embedded Google Map with clinic pin. Set location in Branding tab.', requiredData: ['clinic.latitude', 'clinic.longitude'] })
export { MapBlock }
