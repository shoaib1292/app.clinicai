import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FadeIn } from './fade-in'

type QA = {
  q: string
  a: string
  urdu?: boolean
}

const faqs: QA[] = [
  {
    q: 'Kya mera WhatsApp number change hoga?',
    a: 'Nahi, aap ka existing number hi rahega. QR ek baar scan karein.',
    urdu: true,
  },
  {
    q: 'Voice notes ka kya?',
    a: 'Voice in → voice out, same language (Urdu/English). Elderly patients ke liye perfect.',
    urdu: true,
  },
  {
    q: 'Cash payments me kya hoga?',
    a: 'Cash-first model. Screenshot verification optional hai — agar chahein to patient payment receipt bhej sakta hai.',
    urdu: true,
  },
  {
    q: 'AI galat booking to nahi karega?',
    a: 'Post-generation validator lagta hai. Slot aur fee ko tool results se cross-check karke confirm kiya jaata hai.',
    urdu: true,
  },
  {
    q: 'Kitni zubanein support hain?',
    a: 'Urdu, English, Roman-Urdu. Patient jo bhi zubaan me likhe, AI same zubaan me jawab dega.',
    urdu: true,
  },
  {
    q: 'Free trial kitne din ki hai?',
    a: '14 din, no credit card. Trial ke baad bhi cancel karein to kuch nahi lagta.',
    urdu: true,
  },
  {
    q: 'Meta API ka kharcha kaun dega?',
    a: 'Clinic ka apna Meta Business account, clinic bears cost. Hum sirf PKR 50/appointment charge karte hain.',
    urdu: true,
  },
  {
    q: 'Mera clinic chhota hai — kya suitable hai?',
    a: 'Bilkul. QR mode free, PKR 50 per appointment baad me. Bina kisi risk ke shuru karein.',
    urdu: true,
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <FadeIn className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            FAQ
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Aap ke sawaal, hamare jawab
          </h2>
          <p className="mt-3 text-muted-foreground">
            Common questions jo clinics puchte hain. Aur kuch?{' '}
            <a
              href="#contact"
              className="font-medium text-brand underline-offset-4 hover:underline"
            >
              Hum se rabta karein
            </a>
            .
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mt-10">
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border bg-card px-5"
          >
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className={i === faqs.length - 1 ? 'border-b-0' : ''}
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline sm:text-base">
                  <span className={f.urdu ? 'urdu text-[16px]' : ''} dir={f.urdu ? 'rtl' : 'auto'}>
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p
                    className={`text-sm text-muted-foreground ${
                      f.urdu ? 'urdu text-[15px] leading-relaxed' : ''
                    }`}
                    dir={f.urdu ? 'rtl' : 'auto'}
                  >
                    {f.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  )
}
