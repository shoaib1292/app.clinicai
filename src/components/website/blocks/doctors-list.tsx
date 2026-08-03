import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { CardBase } from './shared/card-base'
import { getImageUrl } from '@/lib/image-url'
import { CTAButton } from './shared/cta-button'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function DoctorsList({ clinic, content }: BlockProps) {
  const doctors = clinic.doctors?.length
    ? clinic.doctors.slice(0, content?.maxItems || 10)
    : content?.doctors || []
  if (doctors.length === 0) return null

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Our Team" heading="Meet Our Specialists" />
      <div className="space-y-4 max-w-3xl mx-auto">
        {doctors.map((doc: any, i: number) => (
          <FadeUp key={doc.id || i} delay={i * 0.1}>
            <CardBase padding="normal" className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full flex-shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--website-primary-light)' }}>
                {doc.imageKey ? (
                  <img src={getImageUrl(doc.imageKey, 100)} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: 'var(--website-primary)' }}>
                    {doc.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold" style={{ color: 'var(--website-text)' }}>{doc.name}</h4>
                <p className="text-sm" style={{ color: 'var(--website-primary)' }}>{doc.speciality}</p>
                {doc.bio && <p className="text-xs mt-1 truncate" style={{ color: 'var(--website-text-muted)' }}>{doc.bio}</p>}
              </div>
              <CTAButton href={content?.ctaLink || `/p/${clinic.slug}/book`} variant="primary" className="text-xs h-9 px-4">
                Book
              </CTAButton>
            </CardBase>
          </FadeUp>
        ))}
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'doctors-list', label: 'Doctors — List', category: 'doctors', component: DoctorsList, defaultContent: {}, description: 'Vertical list with larger doctor cards. Photo left, detail right, book CTA.', requiredData: ['clinic.doctors'] })
export { DoctorsList }
