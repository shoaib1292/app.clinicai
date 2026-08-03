import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { StaggerContainer } from './shared/stagger-container'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function Insurance({ clinic, content }: BlockProps) {
  const panels = content?.items || content?.panels || []
  if (panels.length === 0) return null

  return (
    <SectionWrapper bg="surface">
      <SectionHeader badge="Insurance" heading="Accepted Insurance Panels" subtitle={content?.subtitle || `${clinic.name} works with the following insurance providers`} />
      <StaggerContainer className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
        {panels.map((name: string, i: number) => (
          <span key={i} className="rounded-full px-4 py-2 text-sm font-medium border"
            style={{ borderColor: 'var(--website-border)', color: 'var(--website-text)', backgroundColor: 'var(--website-bg)' }}>
            {name}
          </span>
        ))}
      </StaggerContainer>
    </SectionWrapper>
  )
}

registerBlock({ id: 'insurance', label: 'Insurance Panels', category: 'info', component: Insurance, defaultContent: {}, description: 'Badge grid of accepted insurance/panel providers.', requiredData: [] })
export { Insurance }
