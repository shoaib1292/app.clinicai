import {
  Activity,
  BarChart3,
  ListOrdered,
  Mic,
  Power,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { FadeIn } from './fade-in'

const features = [
  {
    icon: Smartphone,
    title: 'Dual WhatsApp mode',
    value: 'QR + Meta API — dono support. Existing number hi rahega.',
  },
  {
    icon: ListOrdered,
    title: 'Token + Time queues',
    value: 'Patient ko token + estimated time, dono mil jaate hain.',
  },
  {
    icon: Mic,
    title: 'Voice + Text replies',
    value: 'Voice in → voice out, same language. Elderly-friendly.',
  },
  {
    icon: Users,
    title: 'Family memory',
    value: 'Ek number, saari family records — context hamesha.',
  },
  {
    icon: Activity,
    title: 'Live queue status',
    value: 'Patient poochhe “kitni der?” — AI real-time jawab de.',
  },
  {
    icon: Wallet,
    title: 'Cash + Online payments',
    value: 'Cash-first model. Screenshot verification optional.',
  },
  {
    icon: BarChart3,
    title: 'Analytics dashboard',
    value: 'No-shows, peak hours, revenue — sab graphs me.',
  },
  {
    icon: Power,
    title: 'On/off toggle',
    value: 'Chhutti ke din ya emergency — ek click me band karein.',
  },
]

export function Features() {
  return (
    <section id="features" className="bg-card/30 py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Sab kuch jo ek clinic receptionist ko chahiye
          </h2>
          <p className="mt-3 text-muted-foreground">
            8 core capabilities — har patient ke touchpoint pe AI help karega.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <FadeIn key={f.title} delay={(i % 4) * 0.06}>
                <Card className="group h-full gap-4 py-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
                  <CardContent className="space-y-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-sm font-semibold leading-tight">
                      {f.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {f.value}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
