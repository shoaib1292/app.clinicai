import { SectionWrapper } from './shared/section-wrapper'
import { EmptyState } from './shared/empty-state'
import { BookOpen } from 'lucide-react'
import { registerBlock } from './registry'
import type { BlockProps } from './types'

function BlogHighlights({}: BlockProps) {
  return <SectionWrapper bg="default"><EmptyState icon={<BookOpen className="h-8 w-8" />} title="Health Articles" description="Informative health content coming soon." /></SectionWrapper>
}

registerBlock({ id: 'blog-highlights', label: 'Blog Highlights (Soon)', category: 'info', component: BlogHighlights, defaultContent: {}, description: 'Recent health articles preview. Coming in a future update.', requiredData: [] })
export { BlogHighlights }
