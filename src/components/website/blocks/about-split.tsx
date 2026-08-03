import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { EditableText } from './shared/editable-text'
import { resolveTemplate } from '@/lib/website-template-resolver'
import { getImageUrl } from '@/lib/image-url'
import { MapPin, Phone } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function AboutSplit({ clinic, content }: BlockProps) {
  const title = resolveTemplate(content?.title || 'About Us', clinic)
  const body = resolveTemplate(content?.body || clinic.description || `Welcome to {{clinic.name}}. We are committed to providing exceptional healthcare with compassion and expertise.`, clinic)
  const paragraphs = body.split('\n\n').filter(Boolean)

  return (
    <SectionWrapper bg="default" id="about">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <FadeUp>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative"
              style={{ backgroundColor: 'var(--website-primary-light)' }}>
              {clinic.logoKey && (
                <img src={getImageUrl(clinic.logoKey, 400)} alt={clinic.name}
                  className="w-full h-full object-contain p-8" />
              )}
              {!clinic.logoKey && (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-8xl font-bold opacity-20" style={{ color: 'var(--website-primary)' }}>
                    {clinic.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div>
            <span className="inline-block rounded-full px-3 py-1 text-xs font-medium mb-3"
              style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>About Us</span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6"
              style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}>
              <EditableText
                tagName="span"
                value={title}
                blockId="about-split"
                fieldName="title"
                placeholder="About Us"
              />
            </h2>
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-4 leading-relaxed" style={{ color: 'var(--website-text-muted)' }}>{p}</p>
            ))}

            <div className="grid grid-cols-2 gap-4 mt-8">
              {clinic.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--website-primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{clinic.address}</span>
                </div>
              )}
              {clinic.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--website-primary)' }} />
                  <a href={`tel:${clinic.phone}`} className="text-sm font-medium" style={{ color: 'var(--website-primary)' }}>{clinic.phone}</a>
                </div>
              )}
            </div>
          </div>
        </FadeUp>
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'about-split', label: 'About — Split', category: 'about',
  component: AboutSplit, defaultContent: {},
  manifest: {
    name: 'About Section',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'gynae', 'pediatric', 'multi'],
    tags: ['professional', 'split-layout', 'brand-focused'],
    pairsWellWith: ['hero-gradient', 'hero-split', 'doctors-grid', 'services-grid', 'testimonials-cards'],
    visualWeight: 'medium',
    contentDensity: 'balanced',
  },
  description: 'Two-column about section with clinic logo/branding on the left, story on the right.',
  requiredData: ['clinic.name'],
})

export { AboutSplit }
