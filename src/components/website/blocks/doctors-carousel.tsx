'use client'
import { useRef } from 'react'
import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { CardBase } from './shared/card-base'
import { getImageUrl } from '@/lib/image-url'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function DoctorsCarousel({ clinic, content }: BlockProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const doctors = clinic.doctors?.length
    ? clinic.doctors.slice(0, content?.maxItems || 10)
    : content?.doctors || []
  if (doctors.length === 0) return null

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  return (
    <SectionWrapper bg="surface">
      <SectionHeader badge="Our Team" heading="Meet Our Doctors" />
      <div className="relative">
        <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--website-surface)', border: '1px solid var(--website-border)' }}>
          <ChevronLeft className="h-5 w-5" style={{ color: 'var(--website-text)' }} />
        </button>
        <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--website-surface)', border: '1px solid var(--website-border)' }}>
          <ChevronRight className="h-5 w-5" style={{ color: 'var(--website-text)' }} />
        </button>
        <div ref={scrollRef} className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2 snap-x snap-mandatory">
          {doctors.map((doc: any, i: number) => (
            <CardBase key={doc.id || i} className="flex-shrink-0 w-64 snap-center text-center" padding="none">
              <div className="aspect-square flex items-end justify-center" style={{ backgroundColor: 'var(--website-primary-light)' }}>
                {doc.imageKey ? (
                  <img src={getImageUrl(doc.imageKey, 400)} alt={doc.name} className="w-full h-full object-contain object-bottom" />
                ) : (
                  <span className="text-7xl font-bold opacity-20 mb-6" style={{ color: 'var(--website-primary)' }}>{doc.name?.charAt(0)}</span>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-semibold" style={{ color: 'var(--website-text)' }}>{doc.name}</h4>
                <p className="text-sm" style={{ color: 'var(--website-primary)' }}>{doc.speciality}</p>
              </div>
            </CardBase>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'doctors-carousel', label: 'Doctors — Carousel', category: 'doctors', component: DoctorsCarousel, defaultContent: {}, description: 'Horizontal scrollable doctor cards. Best for clinics with 5+ doctors.', requiredData: ['clinic.doctors'] })
export { DoctorsCarousel }
