import { SectionWrapper } from './shared/section-wrapper'
import { SectionHeader } from './shared/section-header'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function FAQ({ clinic, content }: BlockProps) {
  const items = content?.items || [
    { q: 'How do I book an appointment?', a: `You can book online through our website, WhatsApp us, or call ${clinic.phone || 'our clinic'} directly.` },
    { q: 'What are your clinic hours?', a: 'We are open Monday through Saturday. Please check our hours section for exact timings.' },
    { q: 'Do you accept walk-ins?', a: `Yes, walk-ins are welcome at ${clinic.name}. However, booking ahead ensures minimal wait time.` },
    { q: 'What payment methods do you accept?', a: 'We accept cash and online payments via JazzCash and Easypaisa.' },
  ]
  if (items.length === 0) return null

  return (
    <SectionWrapper bg="surface">
      <SectionHeader badge="FAQ" heading="Frequently Asked Questions" />
      <div className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible>
          {items.map((item: any, i: number) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="text-left font-medium" style={{ color: 'var(--website-text)' }}>
                {item.q}
              </AccordionTrigger>
              <AccordionContent style={{ color: 'var(--website-text-muted)' }}>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionWrapper>
  )
}

registerBlock({
  id: 'faq', label: 'FAQ Accordion', category: 'info', component: FAQ, defaultContent: {},
  description: 'Accordion-style FAQ section. Edit Q&As in block settings.',
  requiredData: [],
  manifest: {
    name: 'FAQs',
    industries: ['clinic', 'dentist', 'skin', 'cardiac', 'gynae', 'pediatric', 'multi'],
    tags: ['info', 'accordion', 'trust', 'seo'],
    pairsWellWith: ['about-split', 'services-grid', 'contact-cards', 'footer'],
    visualWeight: 'light',
    contentDensity: 'minimal',
  },
})
export { FAQ }
