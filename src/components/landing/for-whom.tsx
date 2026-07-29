import { Building2, Check, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FadeIn } from './fade-in'

const segments = [
  {
    icon: Stethoscope,
    name: 'Small clinics',
    tagline: 'QR mode, free to start, scales with you.',
    points: [
      'QR scan se 2 minute me live',
      'No setup fee, PKR 50/appointment baad me',
      'Family memory + voice notes built-in',
      'Cancel anytime — no lock-in',
    ],
    cta: 'Free trial shuru karein',
    href: '#lead-form',
    highlight: false,
  },
  {
    icon: Building2,
    name: 'Hospitals',
    tagline: 'Meta API, bulk reminders, multi-doctor, white-label.',
    points: [
      'Multi-doctor, multi-branch support',
      'Bulk WhatsApp reminders via Meta Cloud API',
      'Role-based access (receptionist, doctor, finance)',
      'White-label dashboard + custom domain',
    ],
    cta: 'Sales se baat karein',
    href: '#lead-form',
    highlight: true,
  },
]

export function ForWhom() {
  return (
    <section id="for-whom" className="py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            For whom
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Clinic chhota ho ya hospital — sab ke liye
          </h2>
          <p className="mt-3 text-muted-foreground">
            Do mode, ek platform. Aap ki zaroorat ke hisaab se scale karein.
          </p>
        </FadeIn>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {segments.map((s, i) => {
            const Icon = s.icon
            return (
              <FadeIn key={s.name} delay={i * 0.1}>
                <Card
                  className={`h-full ${
                    s.highlight
                      ? 'border-brand/40 bg-card shadow-lg shadow-brand/5'
                      : ''
                  }`}
                >
                  <CardContent className="space-y-5 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{s.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {s.tagline}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2.5">
                      {s.points.map((p) => (
                        <li
                          key={p}
                          className="flex items-start gap-2.5 text-sm text-foreground/85"
                        >
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                            <Check className="size-3" />
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      variant={s.highlight ? 'default' : 'outline'}
                      className="w-full"
                    >
                      <a href={s.href}>{s.cta}</a>
                    </Button>
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
