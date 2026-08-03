import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { StaggerContainer } from './shared/stagger-container'
import { CardBase } from './shared/card-base'
import { getImageUrl } from '@/lib/image-url'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function DoctorsGrid({ clinic, content }: BlockProps) {
  const doctors = clinic.doctors?.length
    ? clinic.doctors.slice(0, content?.maxItems || 6)
    : content?.doctors || []
  if (doctors.length === 0) return null

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Our Team" heading="Meet Our Doctors" subtitle="Experienced professionals dedicated to your health" />
      <StaggerContainer className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {doctors.map((doc: any, i: number) => (
          <CardBase key={doc.id || i} padding="none" className="overflow-hidden text-center">
            <div className="aspect-[3/4] flex items-end justify-center" style={{ backgroundColor: 'var(--website-primary-light)' }}>
              {doc.imageKey ? (
                <img src={getImageUrl(doc.imageKey, 400)} alt={doc.name}
                  className="w-full h-full object-contain object-bottom p-0" />
              ) : (
                <span className="text-8xl font-bold opacity-20 mb-8" style={{ color: 'var(--website-primary)' }}>
                  {doc.name?.charAt(0) || 'D'}
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold" style={{ color: 'var(--website-text)' }}>{doc.name}</h3>
              <p className="text-sm" style={{ color: 'var(--website-primary)' }}>{doc.speciality}</p>
              {doc.qualifications && <p className="text-xs mt-1" style={{ color: 'var(--website-text-muted)' }}>{doc.qualifications}</p>}
              {doc.languages && <p className="text-xs mt-2 opacity-60" style={{ color: 'var(--website-text-muted)' }}>{doc.languages.split(',').join(' · ')}</p>}
            </div>
          </CardBase>
        ))}
      </StaggerContainer>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'doctors-grid', label: 'Doctors — Grid', category: 'doctors', component: DoctorsGrid, defaultContent: {},
  description: 'Grid of doctor cards with photos, specialties, and bios.',
  requiredData: ['clinic.doctors'],
  manifest: {
    name: 'Doctor Cards Grid',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'gynae', 'pediatric', 'multi'],
    tags: ['trust', 'team', 'grid', 'photo-cards'],
    pairsWellWith: ['hero-gradient', 'hero-split', 'about-split', 'services-grid', 'cta-banner'],
    visualWeight: 'medium',
    contentDensity: 'balanced',
  },
})
export { DoctorsGrid }
