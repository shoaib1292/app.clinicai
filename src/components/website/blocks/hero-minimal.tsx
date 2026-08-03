'use client'
import { motion } from 'framer-motion'
import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { getImageUrl } from '@/lib/image-url'
import { Facebook, Instagram, Twitter } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function HeroMinimal({ clinic, content }: BlockProps) {
  const mainDoctor = clinic.doctors?.[0]
  const doctorImageKey = content?.doctorImageKey || mainDoctor?.imageKey
  const logoText = content?.logoText || clinic.name
  const mainText = content?.mainText || clinic.tagline || ''
  const readMoreLink = content?.readMoreLink || `#about`
  const overlayPart1 = content?.overlayPart1 || 'expert'
  const overlayPart2 = content?.overlayPart2 || 'care.'
  const locationText = content?.locationText || clinic.city || ''

  const socialLinks = clinic.socialLinks ? (() => {
    try { return JSON.parse(clinic.socialLinks) } catch { return null }
  })() : null

  return (
    <SectionWrapper bg="none" spacing="compact" className="relative flex flex-col justify-between min-h-screen p-0 max-w-none">
      <div className="flex flex-col justify-between min-h-screen px-4 sm:px-8 py-6 md:py-10">
        {/* Header */}
        <header className="z-30 flex w-full items-center justify-between max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            className="text-xl font-bold tracking-wider" style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}>
            {clinic.name}
          </motion.div>
        </header>

        {/* Center */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center w-full max-w-7xl mx-auto gap-8">
          <FadeUp delay={0.3} className="order-2 md:order-1 text-center md:text-left">
            {mainText && <p className="max-w-xs mx-auto md:mx-0 text-sm leading-relaxed" style={{ color: 'var(--website-text-muted)' }}>{mainText}</p>}
          </FadeUp>

          <div className="relative order-1 md:order-2 flex justify-center items-center h-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="absolute h-[300px] w-[300px] md:h-[420px] md:w-[420px] lg:h-[520px] lg:w-[520px] rounded-full"
              style={{ backgroundColor: 'var(--website-primary-light)' }}
            />
            {doctorImageKey ? (
              <motion.img
                src={getImageUrl(doctorImageKey, 400)}
                alt={mainDoctor?.name || ''}
                className="relative z-10 h-auto w-48 md:w-56 lg:w-64 object-contain scale-125"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              />
            ) : (
              <motion.div
                className="relative z-10 h-48 w-48 md:h-56 md:w-56 rounded-full flex items-center justify-center text-6xl font-bold"
                style={{ backgroundColor: 'var(--website-primary)', color: '#fff' }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                {clinic.name.charAt(0)}
              </motion.div>
            )}
          </div>

          <FadeUp delay={0.4} className="order-3 flex items-center justify-center md:justify-start">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold leading-none"
              style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}>
              {overlayPart1}<br />{overlayPart2}
            </h1>
          </FadeUp>
        </div>

        {/* Footer */}
        <footer className="z-30 flex w-full items-center justify-between max-w-7xl mx-auto mt-6">
          <FadeUp delay={0.5} className="flex items-center space-x-4">
            {socialLinks?.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-70" style={{ color: 'var(--website-text-muted)' }}><Facebook className="h-5 w-5" /></a>}
            {socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-70" style={{ color: 'var(--website-text-muted)' }}><Instagram className="h-5 w-5" /></a>}
            {socialLinks?.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-70" style={{ color: 'var(--website-text-muted)' }}><Twitter className="h-5 w-5" /></a>}
          </FadeUp>
          <FadeUp delay={0.6}>
            <span className="text-sm font-medium" style={{ color: 'var(--website-text-muted)' }}>{locationText}</span>
          </FadeUp>
        </footer>
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'hero-minimal',
  label: 'Hero — Minimal',
  category: 'hero',
  component: HeroMinimal,
  defaultContent: {},
  description: 'Minimalist hero with large circular background behind doctor photo. Perfect for solo practitioners.',
  requiredData: ['clinic.name', 'clinic.doctors'],
})

export { HeroMinimal }
