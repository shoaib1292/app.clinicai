import { SectionWrapper } from './shared/section-wrapper'
import { EmptyState } from './shared/empty-state'
import { Globe } from 'lucide-react'
import { registerBlock } from './registry'
import type { BlockProps } from './types'

function VirtualTour({}: BlockProps) {
  return <SectionWrapper bg="default"><EmptyState icon={<Globe className="h-8 w-8" />} title="Virtual Tour" description="360° clinic tour coming soon." /></SectionWrapper>
}

registerBlock({ id: 'virtual-tour', label: 'Virtual Tour (Soon)', category: 'gallery', component: VirtualTour, defaultContent: {}, description: '360° virtual tour embed. Coming in a future update.', requiredData: [] })
export { VirtualTour }
