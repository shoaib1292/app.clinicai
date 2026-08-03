import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { CardBase } from './shared/card-base'
import { IconCircle } from './shared/icon-circle'
import { StaggerContainer } from './shared/stagger-container'
import { Stethoscope, Heart, Activity, Baby, Bone, Brain, Eye, Pill } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

const ICON_MAP: Record<string, React.ReactNode> = {
  general: <Stethoscope className="h-6 w-6" />, cardiology: <Heart className="h-6 w-6" />,
  dermatology: <Activity className="h-6 w-6" />, pediatric: <Baby className="h-6 w-6" />,
  orthopedic: <Bone className="h-6 w-6" />, neurology: <Brain className="h-6 w-6" />,
  ophthalmology: <Eye className="h-6 w-6" />, pharmacy: <Pill className="h-6 w-6" />,
}

function ServicesGrid({ clinic, content }: BlockProps) {
  const services = clinic.services?.length
    ? clinic.services.slice(0, 8)
    : content?.items || []
  if (services.length === 0) return null

  const matchIcon = (name: string) => {
    const key = Object.keys(ICON_MAP).find(k => name.toLowerCase().includes(k))
    return key ? ICON_MAP[key] : <Stethoscope className="h-6 w-6" />
  }

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Services" heading="What We Offer" subtitle="Comprehensive healthcare services for you and your family" />
      <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((s: any, i: number) => (
          <CardBase key={i} hover className="flex flex-col gap-4">
            <IconCircle>{matchIcon(s.name || s.shortDescription)}</IconCircle>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--website-text)' }}>{s.name}</h3>
              <p className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{s.shortDescription || s.description}</p>
            </div>
          </CardBase>
        ))}
      </StaggerContainer>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'services-grid', label: 'Services — Grid', category: 'services', component: ServicesGrid, defaultContent: {},
  description: 'Icon + name + description cards in a grid.',
  requiredData: [],
  manifest: {
    name: 'Services Grid',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'gynae', 'pediatric', 'multi'],
    tags: ['services', 'grid', 'icons', 'informational'],
    pairsWellWith: ['hero-gradient', 'about-split', 'doctors-grid', 'pricing-table', 'cta-banner'],
    visualWeight: 'medium',
    contentDensity: 'detailed',
  },
})
export { ServicesGrid }
