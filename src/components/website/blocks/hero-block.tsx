'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Calendar, MessageCircle, MapPin, Phone, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { BlockProps } from './types'
import { optimizeImage, IMAGE_SIZES } from '@/lib/cloudinary-optimize'

export function HeroBlock({ clinic, content }: BlockProps) {
  const ai = content || {}
  const headline = ai.headline || clinic.tagline || clinic.name
  const subheadline = ai.subheadline || clinic.description?.slice(0, 120) || `Quality healthcare in ${clinic.city || 'your city'}`
  const ctaText = ai.ctaText || 'Book Appointment'
  const hasHero = !!clinic.heroImageUrl

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--website-surface)' }} />

      {hasHero && (
        <div className="absolute inset-0">
          <img
            src={optimizeImage(clinic.heroImageUrl!, IMAGE_SIZES.hero.width, IMAGE_SIZES.hero.height)}
            srcSet={`${optimizeImage(clinic.heroImageUrl!, IMAGE_SIZES.heroMobile.width, IMAGE_SIZES.heroMobile.height)} 700w, ${optimizeImage(clinic.heroImageUrl!, IMAGE_SIZES.hero.width, IMAGE_SIZES.hero.height)} 1400w`}
            sizes="100vw"
            alt={clinic.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
      )}

      {/* Background beams effect when no hero image */}
      {!hasHero && (
        <>
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-3xl"
            style={{ background: `radial-gradient(circle, var(--website-primary), transparent 70%)` }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl"
            style={{ background: `radial-gradient(circle, var(--website-primary), transparent 70%)` }} />
        </>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Logo / Initial */}
          <div className="mb-8">
            {clinic.logoUrl ? (
              <img src={optimizeImage(clinic.logoUrl, IMAGE_SIZES.logo.width, IMAGE_SIZES.logo.height)} alt={clinic.name} className="h-16 w-auto mx-auto object-contain" />
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl"
                style={{ background: 'var(--website-primary)' }}>
                {clinic.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Location + Phone Badge */}
          {(clinic.city || clinic.phone) && (
            <div className={cn("inline-flex flex-wrap items-center justify-center gap-2 mb-6", hasHero && "text-white")}>
              {clinic.city && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs"
                  style={hasHero ? { borderColor: 'rgba(255,255,255,0.3)', color: '#fff', background: 'rgba(255,255,255,0.1)' } : {}}>
                  <MapPin className="w-3 h-3" /> {clinic.city}
                </Badge>
              )}
              {clinic.phone && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs"
                  style={hasHero ? { borderColor: 'rgba(255,255,255,0.3)', color: '#fff', background: 'rgba(255,255,255,0.1)' } : {}}>
                  <Phone className="w-3 h-3" /> {clinic.phone}
                </Badge>
              )}
            </div>
          )}

          {/* Headline */}
          <h1 className={cn(
            "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight",
          )}
            style={{
              fontFamily: 'var(--website-font-heading)',
              color: hasHero ? '#ffffff' : 'var(--website-text)',
            }}>
            {headline}
          </h1>

          {/* Subheadline */}
          <p className={cn(
            "text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed",
            hasHero ? 'text-white/80' : 'text-muted-foreground'
          )}>
            {subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="gap-2 text-base h-12 px-8 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              style={{ background: 'var(--website-primary)' }}
            >
              <a href={`/p/${clinic.slug}/book`}>
                <Calendar className="w-5 h-5" /> {ctaText}
              </a>
            </Button>

            {clinic.whatsappNumber && (
              <Button
                asChild
                variant={hasHero ? 'secondary' : 'outline'}
                size="lg"
                className="gap-2 text-base h-12 px-8 rounded-xl font-semibold hover:scale-105 transition-transform"
                style={hasHero ? { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' } : {}}
              >
                <a href={`https://wa.me/${clinic.whatsappNumber.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" /> WhatsApp
                </a>
              </Button>
            )}

            <Button
              asChild
              variant={hasHero ? 'secondary' : 'outline'}
              size="lg"
              className="gap-1 text-base h-12 px-8 rounded-xl font-semibold hover:scale-105 transition-transform"
              style={hasHero ? { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' } : {}}
            >
              <a href="/about">Learn More <ChevronRight className="w-4 h-4" /></a>
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex justify-center gap-12 flex-wrap">
            {[
              { value: clinic.doctors?.length?.toString() || '10+', label: 'Doctors' },
              { value: clinic.city || 'Your City', label: 'Location' },
              { value: '24/7', label: 'Support' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="text-center"
              >
                <div className={cn("text-2xl font-bold", hasHero ? 'text-white' : 'text-primary')}
                  style={{ fontFamily: 'var(--website-font-heading)' }}>
                  {stat.value}
                </div>
                <div className={cn("text-xs mt-1 uppercase tracking-wider", hasHero ? 'text-white/60' : 'text-muted-foreground')}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
