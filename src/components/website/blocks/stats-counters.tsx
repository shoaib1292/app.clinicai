'use client'
import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { StaggerContainer } from './shared/stagger-container'
import { CountUp } from './shared/count-up'
import { Users, Stethoscope, Calendar, Building2 } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function StatsCounters({ clinic, content }: BlockProps) {
  const stats = clinic.clinicStats ? JSON.parse(clinic.clinicStats) : null
  if (!stats) return null

  const items = [
    { end: Number(stats.yearsOfExperience), suffix: '+', label: 'Years Experience', icon: Calendar },
    { end: Number(stats.totalPatients), suffix: stats.totalPatients >= 1000 ? 'K+' : '+', label: 'Patients Served', icon: Users },
    { end: Number(stats.totalDoctors), suffix: '+', label: 'Doctors', icon: Stethoscope },
    { end: Number(stats.totalBranches || 1), suffix: '', label: 'Location(s)', icon: Building2 },
  ].filter(i => i.end > 0)

  if (items.length === 0) return null

  return (
    <SectionWrapper bg="surface">
      <SectionHeader
        badge={content?.badge || 'By the Numbers'}
        heading={content?.heading || 'Trusted Healthcare'}
        subtitle={content?.subtitle || 'Numbers that speak for themselves'}
      />
      <StaggerContainer className={`grid grid-cols-2 md:grid-cols-${Math.min(items.length, 4)} gap-8 text-center`}>
        {items.map((item, i) => (
          <div key={i} className="p-6">
            <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--website-primary)' }}>
              <CountUp end={item.end} suffix={item.suffix} />
            </div>
            <div className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{item.label}</div>
          </div>
        ))}
      </StaggerContainer>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'stats-counters', label: 'Stats & Counters', category: 'trust',
  component: StatsCounters, defaultContent: {},
  description: 'Animated number counters for years, patients, doctors. Set clinic stats in Branding tab.',
  requiredData: ['clinic.clinicStats'],
})

export { StatsCounters }
