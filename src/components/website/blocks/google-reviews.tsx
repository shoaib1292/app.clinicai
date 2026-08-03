import { SectionWrapper } from './shared/section-wrapper'
import { EmptyState } from './shared/empty-state'
import { registerBlock } from './registry'
import type { BlockProps } from './types'

function GoogleReviews({ clinic }: BlockProps) {
  return (
    <SectionWrapper bg="default">
      <EmptyState title="Google Reviews" description={`Embed ${clinic.name}'s Google reviews here. Coming soon.`} />
    </SectionWrapper>
  )
}

registerBlock({ id: 'google-reviews', label: 'Google Reviews (Soon)', category: 'trust', component: GoogleReviews, defaultContent: {}, description: 'Embedded Google Reviews widget. Coming in a future update.', requiredData: [] })
export { GoogleReviews }
