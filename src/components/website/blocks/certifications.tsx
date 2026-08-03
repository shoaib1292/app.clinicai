'use client'
import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { CardBase } from './shared/card-base'
import { IconCircle } from './shared/icon-circle'
import { Award, Shield, GraduationCap, Star } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function Certifications({ clinic, content }: BlockProps) {
  const items = content?.items || []
  if (items.length === 0) return null

  const icons: Record<string, React.ReactNode> = {
    award: <Award className="h-6 w-6" />,
    shield: <Shield className="h-6 w-6" />,
    cap: <GraduationCap className="h-6 w-6" />,
    star: <Star className="h-6 w-6" />,
  }

  return (
    <SectionWrapper bg="surface">
      <SectionHeader
        badge={content?.badge || 'Credentials'}
        heading={content?.heading || 'Certified & Trusted'}
        subtitle={content?.subtitle}
      />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {items.map((item: any, i: number) => (
          <FadeUp key={i} delay={i * 0.1}>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <IconCircle size="lg">
                  {icons[item.icon] || <Award className="h-6 w-6" />}
                </IconCircle>
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--website-text)' }}>{item.name}</div>
            </div>
          </FadeUp>
        ))}
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'certifications', label: 'Certifications', category: 'trust',
  component: Certifications, defaultContent: {},
  description: 'Badge grid showing clinic certifications, doctor degrees, and affiliations.',
  requiredData: [],
})

export { Certifications }
