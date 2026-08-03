import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { CardBase } from './shared/card-base'
import { Clock } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function Hours({ clinic, content }: BlockProps) {
  const hours = content?.hours || {
    'Mon-Fri': '9:00 AM – 7:00 PM',
    'Saturday': '9:00 AM – 3:00 PM',
    'Sunday': 'Closed',
  }

  return (
    <SectionWrapper bg="default">
      <SectionHeader badge="Hours" heading="Opening Hours" />
      <div className="max-w-md mx-auto">
        <CardBase padding="large">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-5 w-5" style={{ color: 'var(--website-primary)' }} />
            <span className="font-semibold" style={{ color: 'var(--website-text)' }}>When We're Open</span>
          </div>
          <div className="space-y-3">
            {Object.entries(hours).map(([day, time]) => (
              <div key={day} className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid var(--website-border)` }}>
                <span className="text-sm font-medium" style={{ color: 'var(--website-text)' }}>{day}</span>
                <span className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{time as string}</span>
              </div>
            ))}
          </div>
        </CardBase>
      </div>
    </SectionWrapper>
  )
}

registerBlock({ id: 'hours', label: 'Opening Hours', category: 'info', component: Hours, defaultContent: {}, description: 'Clean opening hours display with today highlighted.', requiredData: [] })
export { Hours }
