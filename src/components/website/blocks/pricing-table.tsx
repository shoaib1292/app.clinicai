import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { CTAButton } from './shared/cta-button'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function PricingTable({ clinic, content }: BlockProps) {
  const services = clinic.services?.length
    ? clinic.services.slice(0, 10)
    : content?.items || []
  if (services.length === 0) return null

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Pricing" heading="Transparent Fees" subtitle="No hidden charges. Pay at clinic." />
      <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--website-border)' }}>
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--website-primary-light)' }}>
            <tr>
              <th className="text-left p-4 text-sm font-semibold" style={{ color: 'var(--website-text)' }}>Service</th>
              <th className="text-center p-4 text-sm font-semibold" style={{ color: 'var(--website-text)' }}>Duration</th>
              <th className="text-right p-4 text-sm font-semibold" style={{ color: 'var(--website-text)' }}>Fee</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {services.map((s: any, i: number) => (
              <tr key={i} style={{ borderTop: `1px solid var(--website-border)` }}>
                <td className="p-4 text-sm" style={{ color: 'var(--website-text)' }}>{s.name}</td>
                <td className="p-4 text-sm text-center" style={{ color: 'var(--website-text-muted)' }}>{s.durationMin || 15} min</td>
                <td className="p-4 text-sm text-right font-semibold" style={{ color: 'var(--website-primary)' }}>PKR {s.fee || s.baseFee || 0}</td>
                <td className="p-4">
                  <CTAButton href={`/p/${clinic.slug}/book`} variant="primary" className="text-xs h-8 px-3">Book</CTAButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'pricing-table', label: 'Pricing Table', category: 'services', component: PricingTable, defaultContent: {}, description: 'Clean pricing table with service name, duration, fee, and book CTA.', requiredData: [] })
export { PricingTable }
