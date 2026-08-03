import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { IconCircle } from './shared/icon-circle'
import { Image } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function GalleryGrid({ clinic, content }: BlockProps) {
  const images = content?.images || clinic.galleryImages || []
  if (images.length === 0) {
    return (
      <SectionWrapper bg="default">
        <SectionHeader badge="Gallery" heading="Our Clinic" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--website-primary-light)' }}>
              <Image className="h-8 w-8 opacity-30" style={{ color: 'var(--website-primary)' }} />
            </div>
          ))}
        </div>
      </SectionWrapper>
    )
  }

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Gallery" heading="Inside Our Clinic" />
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {images.map((img: any, i: number) => (
          <FadeUp key={i} delay={i * 0.1}>
            <div className="break-inside-avoid rounded-2xl overflow-hidden">
              <img src={img.url} alt={img.alt || ''} className="w-full h-auto rounded-2xl transition-transform hover:scale-[1.02]" />
              {img.caption && <p className="text-xs mt-2 text-center" style={{ color: 'var(--website-text-muted)' }}>{img.caption}</p>}
            </div>
          </FadeUp>
        ))}
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'gallery-grid', label: 'Gallery — Grid', category: 'gallery', component: GalleryGrid, defaultContent: {}, description: 'Masonry-style image grid with lightbox effect. Auto-layout columns.', requiredData: [] })
export { GalleryGrid }
