'use client'
import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { StaggerContainer } from './shared/stagger-container'
import { CardBase } from './shared/card-base'
import { Star, Quote } from 'lucide-react'
import type { BlockProps, TestimonialItem } from './types'
import { registerBlock } from './registry'
import { getImageUrl } from '@/lib/image-url'

function TestimonialsCards({ clinic, content }: BlockProps) {
  const items: TestimonialItem[] = content?.testimonials || []
  if (items.length === 0) return null

  return (
    <SectionWrapper bg="default">
      <SectionHeader
        badge={content?.badge || 'Patient Stories'}
        heading={content?.heading || 'What Our Patients Say'}
        subtitle={content?.subtitle}
      />
      <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((t, i) => (
          <CardBase key={i} padding="large" className="relative">
            <Quote className="absolute top-6 right-6 h-8 w-8 opacity-10" style={{ color: 'var(--website-primary)' }} />
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="h-4 w-4" fill={s < t.rating ? 'var(--website-primary)' : 'none'}
                  style={{ color: 'var(--website-primary)' }} />
              ))}
            </div>
            <p className="text-sm italic mb-6 leading-relaxed" style={{ color: 'var(--website-text)' }}>"{t.text}"</p>
            <div className="flex items-center gap-3">
              {t.avatarUrl ? (
                <img src={t.avatarUrl} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
                  {t.name.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--website-text)' }}>{t.name}</div>
                <div className="text-xs" style={{ color: 'var(--website-text-muted)' }}>Verified Patient</div>
              </div>
            </div>
          </CardBase>
        ))}
      </StaggerContainer>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'testimonials-cards', label: 'Testimonials — Cards', category: 'trust',
  component: TestimonialsCards, defaultContent: {},
  description: 'Patient testimonial cards with star ratings. Edit content in block settings.',
  requiredData: [],
  manifest: {
    name: 'Patient Testimonials',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'gynae', 'pediatric', 'multi'],
    tags: ['trust', 'social-proof', 'reviews', 'cards'],
    pairsWellWith: ['about-split', 'doctors-grid', 'services-grid', 'cta-banner'],
    visualWeight: 'medium',
    contentDensity: 'balanced',
  },
})

export { TestimonialsCards }
