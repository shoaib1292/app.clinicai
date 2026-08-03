'use client'
import { motion } from 'framer-motion'
import { SectionWrapper } from './shared/section-wrapper'
import { FadeUp } from './shared/fade-up'
import { CTAButton } from './shared/cta-button'
import { EditableText } from './shared/editable-text'
import { resolveTemplate } from '@/lib/website-template-resolver'
import { getImageUrl } from '@/lib/image-url'
import { ArrowRight } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function HeroSplit({ clinic, content }: BlockProps) {
  const title = resolveTemplate(content?.title || `Expert Medical Care at {{clinic.name}}`, clinic)
  const description = resolveTemplate(content?.description || clinic.tagline || '', clinic)
  const buttonText = content?.buttonText || 'Book Appointment'
  const buttonLink = content?.buttonLink || `/p/${clinic.slug}/book`
  const image1Key = content?.image1Key || clinic.galleryImages?.[0]?.url || clinic.heroImageKey
  const image2Key = content?.image2Key || clinic.galleryImages?.[1]?.url

  return (
    <SectionWrapper bg="none" spacing="compact" className="relative overflow-hidden min-h-[80vh]">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(var(--website-text) 1px, transparent 1px), linear-gradient(to right, var(--website-text) 1px, transparent 1px)`,
        backgroundSize: '3rem 3rem',
      }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--website-bg)]" />

      <div className="relative container mx-auto flex items-center justify-between px-4 py-16 lg:flex-row flex-col gap-12">
        <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
          <FadeUp>
            <EditableText
              tagName="h1"
              value={title}
              blockId="hero-split"
              fieldName="title"
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--website-font-heading)', color: 'var(--website-text)' }}
            />
          </FadeUp>
          <FadeUp delay={0.1}>
            <EditableText
              tagName="p"
              value={description}
              blockId="hero-split"
              fieldName="description"
              className="mt-6 max-w-xl text-lg"
              style={{ color: 'var(--website-text-muted)' }}
            />
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-8">
              <CTAButton href={buttonLink} variant="primary">{buttonText} <ArrowRight className="ml-2 h-4 w-4 inline" /></CTAButton>
            </div>
          </FadeUp>
        </div>

        <motion.div className="relative flex-1 flex items-center justify-center h-64 md:h-80"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}>
          {image2Key && (
            <motion.img
              src={getImageUrl(image2Key, 400)}
              alt=""
              whileHover={{ y: -8, rotate: -5 }}
              className="absolute h-52 md:h-72 rounded-2xl shadow-2xl object-cover transform rotate-[-6deg] translate-x-20"
            />
          )}
          {image1Key ? (
            <motion.img
              src={getImageUrl(image1Key, 400)}
              alt=""
              whileHover={{ y: -8, rotate: 5 }}
              className="absolute h-52 md:h-72 rounded-2xl shadow-2xl object-cover transform rotate-[6deg] -translate-x-12"
            />
          ) : (
            <motion.div
              className="absolute h-52 md:h-72 w-52 md:w-72 rounded-2xl shadow-2xl flex items-center justify-center transform rotate-[6deg] -translate-x-12"
              style={{ backgroundColor: 'var(--website-primary-light)' }}>
              <span className="text-6xl font-bold opacity-30" style={{ color: 'var(--website-primary)' }}>
                {clinic.name.charAt(0)}
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'hero-split',
  label: 'Hero — Split',
  manifest: {
    name: 'Split Hero',
    industries: ['clinic', 'dentist', 'skin', 'gynae', 'pediatric'],
    tags: ['modern', 'image-heavy', 'split-layout'],
    pairsWellWith: ['about-split', 'doctors-grid', 'services-grid', 'cta-banner'],
    visualWeight: 'heavy',
    contentDensity: 'balanced',
  },
  category: 'hero',
  component: HeroSplit,
  defaultContent: {},
  description: 'Two-column hero with text left and overlapping card images right. Modern financial-app style.',
  requiredData: ['clinic.name', 'clinic.slug'],
})

export { HeroSplit }
