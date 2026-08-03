import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { getImageUrl } from '@/lib/image-url'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function DoctorSpotlight({ clinic, content }: BlockProps) {
  const doc = content?.doctor || clinic.doctors?.[0]
  if (!doc) return null

  return (
    <SectionWrapper bg="surface">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <FadeUp>
          <div className="rounded-2xl overflow-hidden aspect-[4/5]" style={{ backgroundColor: 'var(--website-primary-light)' }}>
            {doc.imageKey ? (
              <img src={getImageUrl(doc.imageKey, 800)} alt={doc.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-9xl font-bold opacity-20" style={{ color: 'var(--website-primary)' }}>{doc.name.charAt(0)}</span>
              </div>
            )}
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <span className="inline-block rounded-full px-3 py-1 text-xs font-medium mb-4" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
            Meet Our Doctor
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}>
            Dr. {doc.name}
          </h2>
          <p className="text-lg mb-2" style={{ color: 'var(--website-primary)' }}>{doc.speciality}</p>
          {doc.qualifications && <p className="text-sm mb-4" style={{ color: 'var(--website-text-muted)' }}>{doc.qualifications}</p>}
          {doc.bio && <p className="mb-6 leading-relaxed" style={{ color: 'var(--website-text-muted)' }}>{doc.bio}</p>}
          <CTAButton href={content?.ctaLink || `/p/${clinic.slug}/book`} variant="primary">
            {content?.ctaText || 'Book with Dr. ' + doc.name}
          </CTAButton>
        </FadeUp>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'doctor-spotlight', label: 'Doctor Spotlight', category: 'about', component: DoctorSpotlight, defaultContent: {}, description: 'Full-width feature of a single doctor with large portrait and bio.', requiredData: ['clinic.doctors'] })
export { DoctorSpotlight }
