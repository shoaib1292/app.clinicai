import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { Image } from 'lucide-react'
import type { BlockProps, GalleryImage } from './types'

export function GalleryBlock({ clinic, content }: BlockProps) {
  const images: GalleryImage[] = (content?.gallery || content?.images || clinic.galleryImages || [])

  return (
    <section className="py-20 px-4" style={{ background: 'var(--website-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="gap-1.5 font-semibold mb-4">Photo Gallery</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
            Our Clinic
          </h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            Take a look inside {clinic.name}.
          </p>
        </div>

        {images.length > 0 ? (
          <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true, align: 'start' }}>
            <CarouselContent>
              {images.map((img, i) => (
                <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="border overflow-hidden">
                    <CardContent className="p-2">
                      <div className="aspect-[4/3] rounded-lg overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.alt || `Gallery image ${i + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      {img.caption && (
                        <p className="text-xs text-center mt-2 text-muted-foreground">{img.caption}</p>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-4 mt-6">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </Carousel>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--website-primary-light)' }}>
                <Image className="w-8 h-8" style={{ color: 'var(--website-primary)' }} />
              </div>
              <p className="text-base text-muted-foreground mb-1">Gallery photos will appear here.</p>
              <p className="text-sm text-muted-foreground/70">Upload clinic photos from your dashboard to showcase your facilities.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
