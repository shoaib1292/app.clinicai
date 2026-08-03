import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { getImageUrl } from '@/lib/image-url'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function DoctorProfile({ clinic, content }: BlockProps) {
  const doc = content?.doctor || clinic.doctors?.[0]
  if (!doc) return null

  return (
    <SectionWrapper bg="default">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-shrink-0 w-40 h-40 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--website-primary-light)' }}>
            {doc.imageKey ? <img src={getImageUrl(doc.imageKey, 400)} alt={doc.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ color: 'var(--website-primary)' }}>{doc.name?.charAt(0)}</div>}
          </div>
          <div className="flex-1">
            <FadeUp>
              <span className="inline-block rounded-full px-3 py-1 text-xs font-medium mb-3" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>{doc.speciality}</span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}>Dr. {doc.name}</h2>
              {doc.qualifications && <p className="text-sm mb-3" style={{ color: 'var(--website-text-muted)' }}>{doc.qualifications}</p>}
              {doc.languages && <p className="text-xs mb-4" style={{ color: 'var(--website-text-muted)' }}>Speaks: {doc.languages.split(',').join(', ')}</p>}
              {doc.bio && <p className="leading-relaxed mb-6" style={{ color: 'var(--website-text-muted)' }}>{doc.bio}</p>}
              <CTAButton href={`/p/${clinic.slug}/book`} variant="primary">Book Appointment</CTAButton>
            </FadeUp>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'doctor-profile', label: 'Doctor — Profile', category: 'doctors', component: DoctorProfile, defaultContent: {}, description: 'Single doctor detailed profile with photo, bio, and book CTA.', requiredData: ['clinic.doctors'] })
export { DoctorProfile }
