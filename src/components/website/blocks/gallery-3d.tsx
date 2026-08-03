'use client'
import { useState, useEffect, useCallback } from 'react'
import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { getImageUrl } from '@/lib/image-url'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function Gallery3D({ clinic, content }: BlockProps) {
  const images = content?.images || clinic.galleryImages || []
  const [current, setCurrent] = useState(0)
  if (images.length === 0) return null

  const next = useCallback(() => setCurrent(p => (p + 1) % images.length), [images.length])
  const prev = () => setCurrent(p => (p - 1 + images.length) % images.length)

  useEffect(() => { const t = setInterval(next, 4000); return () => clearInterval(t) }, [next])

  return (
    <SectionWrapper bg="surface">
      <SectionHeader badge="Gallery" heading="Inside Our Clinic" />
      <div className="relative w-full flex items-center justify-center [perspective:1000px] h-[350px] md:h-[450px]">
        {images.map((img: any, i: number) => {
          const offset = i - current
          const total = images.length
          let pos = (offset + total) % total
          if (pos > Math.floor(total / 2)) pos = pos - total
          const isCenter = pos === 0
          const isAdjacent = Math.abs(pos) === 1
          return (
            <div key={i} className="absolute w-48 md:w-64 h-96 md:h-[450px] flex items-center justify-center transition-all duration-500 ease-in-out"
              style={{
                transform: `translateX(${pos * 45}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -10}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
              }}>
              <img src={img.url} alt={img.alt || ''} className="object-cover w-full h-full rounded-3xl border-2 border-white/10 shadow-2xl" />
            </div>
          )
        })}
        <button onClick={prev} className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 z-20 flex items-center justify-center"
          style={{ backgroundColor: 'var(--website-surface)', border: '1px solid var(--website-border)' }}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next} className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 z-20 flex items-center justify-center"
          style={{ backgroundColor: 'var(--website-surface)', border: '1px solid var(--website-border)' }}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'gallery-3d', label: 'Gallery — 3D Carousel', category: 'gallery', component: Gallery3D, defaultContent: {}, description: 'Premium 3D perspective image carousel. Best with 5+ high-quality photos.', requiredData: [] })
export { Gallery3D }
