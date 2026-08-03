import { Button } from '@/components/ui/button'
import { Calendar, Phone } from 'lucide-react'
import type { BlockProps } from './types'

export function CTABlock({ clinic }: BlockProps) {
  return (
    <section className="py-24 px-4 text-center relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, var(--website-primary), color-mix(in srgb, var(--website-primary) 70%, #000))` }}>
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.06] translate-x-1/2 -translate-y-1/2"
        style={{ background: 'white' }} />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-[0.08] -translate-x-1/3 translate-y-1/3"
        style={{ background: 'white' }} />
      <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full opacity-20" style={{ background: 'white' }} />

      <div className="relative z-10 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'var(--website-font-heading)' }}>
          Ready to Visit {clinic.name}?
        </h2>
        <p className="text-white/70 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          Book your appointment in seconds. Our team is ready to provide you with the best care.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="gap-2 text-base h-12 px-8 rounded-xl font-semibold bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform shadow-xl"
          >
            <a href={`/p/${clinic.slug}/book`}>
              <Calendar className="w-5 h-5" /> Book Appointment
            </a>
          </Button>
          {clinic.phone && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 text-base h-12 px-8 rounded-xl font-semibold text-white border-white/30 hover:bg-white/10 hover:scale-105 transition-transform"
            >
              <a href={`tel:${clinic.phone}`}>
                <Phone className="w-5 h-5" /> {clinic.phone}
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
