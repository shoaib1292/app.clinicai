'use client'
import { SectionWrapper } from './shared/section-wrapper'
import { registerBlock } from './registry'
import type { BlockProps } from './types'

function SocialProof({ clinic }: BlockProps) {
  return (
    <SectionWrapper bg="surface" spacing="compact">
      <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--website-text-muted)' }}>
        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--website-primary)' }} /><span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: 'var(--website-primary)' }} /></span>
        <span>Patients are booking appointments at <strong style={{ color: 'var(--website-text)' }}>{clinic.name}</strong> right now</span>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'social-proof', label: 'Social Proof Ticker', category: 'trust', component: SocialProof, defaultContent: {}, description: 'Live activity ticker: "Patients are booking right now".', requiredData: ['clinic.name'] })
export { SocialProof }
