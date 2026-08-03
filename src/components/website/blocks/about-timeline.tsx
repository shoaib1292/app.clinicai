'use client'
import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { FadeUp } from './shared/fade-up'
import { Dot } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function AboutTimeline({ clinic, content }: BlockProps) {
  const milestones = content?.milestones || [
    { year: 'Established', title: `${clinic.name} Founded`, body: clinic.tagline || 'Our journey in healthcare began.' },
  ]
  if (milestones.length === 0) return null

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Our Journey" heading="The Road So Far" />
      <div className="relative max-w-2xl mx-auto">
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ backgroundColor: 'var(--website-border)' }} />
        {milestones.map((m: any, i: number) => (
          <FadeUp key={i} delay={i * 0.15}>
            <div className={`flex items-start gap-6 mb-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
              <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'} hidden md:block`}>
                {i % 2 === 0 && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--website-surface)' }}>
                    <h4 className="font-semibold" style={{ color: 'var(--website-text)' }}>{m.title}</h4>
                    <p className="text-sm mt-1" style={{ color: 'var(--website-text-muted)' }}>{m.body}</p>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2"
                style={{ borderColor: 'var(--website-primary)', backgroundColor: 'var(--website-bg)' }}>
                <Dot className="h-5 w-5" style={{ color: 'var(--website-primary)' }} />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--website-primary)' }}>{m.year}</span>
                <div className={`${i % 2 === 1 ? 'hidden md:block' : 'md:hidden'} p-4 rounded-2xl`} style={{ backgroundColor: 'var(--website-surface)' }}>
                  <h4 className="font-semibold" style={{ color: 'var(--website-text)' }}>{m.title}</h4>
                  <p className="text-sm mt-1" style={{ color: 'var(--website-text-muted)' }}>{m.body}</p>
                </div>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'about-timeline', label: 'About — Timeline', category: 'about', component: AboutTimeline, defaultContent: {}, description: 'Vertical timeline showing clinic milestones. Edit in block settings.', requiredData: [] })
export { AboutTimeline }
