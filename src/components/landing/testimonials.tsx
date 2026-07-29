import { Star } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { FadeIn } from './fade-in'

type Testimonial = {
  initials: string
  name: string
  clinic: string
  city: string
  quote: string
  urdu?: boolean
}

const testimonials: Testimonial[] = [
  {
    initials: 'AA',
    name: 'Dr. Ahmed',
    clinic: 'Al-Shifa Family Clinic',
    city: 'Karachi',
    quote:
      'Mera receptionist ab free hai. AI ne 80% calls le li.',
    urdu: true,
  },
  {
    initials: 'AK',
    name: 'Dr. Ayesha',
    clinic: 'Medicare Hospital',
    city: 'Lahore',
    quote:
      'Voice notes ka jawab voice me aata hai — elderly patients khush hain.',
    urdu: true,
  },
  {
    initials: 'IS',
    name: 'Dr. Imran',
    clinic: 'City Dental Care',
    city: 'Islamabad',
    quote: 'No-show rate 35% se 12% gir gayi.',
    urdu: true,
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Clinics kya kehte hain
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pakistan bhar ke doctors ne ClinicAI par bharosa kiya.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <Card className="h-full gap-5">
                <CardContent className="space-y-5 py-2">
                  <div className="flex items-center gap-1 text-brand">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="size-4 fill-brand"
                        aria-hidden
                      />
                    ))}
                    <span className="sr-only">5 out of 5 stars</span>
                  </div>

                  <blockquote
                    className={`text-sm leading-relaxed text-foreground/85 ${
                      t.urdu ? 'urdu text-[15px]' : ''
                    }`}
                    dir={t.urdu ? 'rtl' : 'auto'}
                  >
                    “{t.quote}”
                  </blockquote>

                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <Avatar className="size-10 border border-border">
                      <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand">
                        {t.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.clinic} · {t.city}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.2}>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Testimonials mocked for launch. Real clinic names will replace
            these post-pilot.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
