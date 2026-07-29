import { QrCode, Bot, MessageCircle } from 'lucide-react'
import { FadeIn } from './fade-in'

const steps = [
  {
    icon: QrCode,
    title: 'WhatsApp connect karein',
    caption: 'QR scan ya Meta API — 2 minute me aap ka existing number live.',
  },
  {
    icon: Bot,
    title: 'AI agent setup karein',
    caption: 'Naam, zubaan (Urdu/English), tone — clinic ke hisaab se customize.',
  },
  {
    icon: MessageCircle,
    title: 'Patient bhejein',
    caption: 'AI khud booking, reminder, follow-up sab sambhal lega — 24/7.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            How it works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            3 step me live. Bina kisi training ke.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Set up ek baar, har patient ke liye kaam karega — din raat.
          </p>
        </FadeIn>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <FadeIn key={s.title} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Icon className="size-6" />
                    </div>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      STEP {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {s.caption}
                  </p>

                  {/* Connector arrow between steps (desktop) */}
                  {i < steps.length - 1 && (
                    <div
                      aria-hidden
                      className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-border md:block"
                    >
                      <svg
                        width="32"
                        height="16"
                        viewBox="0 0 32 16"
                        fill="none"
                      >
                        <path
                          d="M0 8h28m0 0l-6-6m6 6l-6 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}
