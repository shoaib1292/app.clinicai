import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { CardBase } from './shared/card-base'
import { IconCircle } from './shared/icon-circle'
import { Eye, Target, Heart, Lightbulb } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function AboutVision({ clinic, content }: BlockProps) {
  const items = content?.items || [
    { icon: 'eye', title: 'Our Mission', body: `To provide accessible, compassionate healthcare to every patient who walks through our doors at ${clinic.name}.` },
    { icon: 'target', title: 'Our Vision', body: `To become the most trusted healthcare provider in ${clinic.city || 'our community'}, setting the standard for patient care.` },
    { icon: 'heart', title: 'Our Values', body: 'Compassion, integrity, excellence, and respect form the foundation of everything we do.' },
    { icon: 'lightbulb', title: 'Our Approach', body: 'We combine modern medical technology with a human touch, treating every patient like family.' },
  ]

  const icons: Record<string, React.ReactNode> = {
    eye: <Eye className="h-6 w-6" />, target: <Target className="h-6 w-6" />,
    heart: <Heart className="h-6 w-6" />, lightbulb: <Lightbulb className="h-6 w-6" />,
  }

  return (
    <SectionWrapper bg="surface">
      <SectionHeader badge="Our Ethos" heading="Why We Do What We Do" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item: any, i: number) => (
          <FadeUp key={i} delay={i * 0.1}>
            <CardBase padding="large" className="text-center h-full">
              <div className="flex justify-center mb-4">
                <IconCircle size="lg">{icons[item.icon] || <Heart className="h-6 w-6" />}</IconCircle>
              </div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--website-text)' }}>{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--website-text-muted)' }}>{item.body}</p>
            </CardBase>
          </FadeUp>
        ))}
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'about-vision', label: 'About — Mission & Vision', category: 'about',
  component: AboutVision, defaultContent: {},
  description: 'Mission/Vision/Values cards with icons. Great for establishing clinic philosophy.',
  requiredData: ['clinic.name'],
})

export { AboutVision }
