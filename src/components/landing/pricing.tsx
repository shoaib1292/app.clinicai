import { Check, Infinity as InfinityIcon } from 'lucide-react'
import { FadeIn } from './fade-in'

export function Pricing() {
  return (
    <section id="pricing" className="bg-card/30 py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Transparent. Sirf ek price.
          </h2>
          <p className="mt-3 text-muted-foreground">
            No hidden fees. No monthly charges. Sirf jab AI booking kare.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mx-auto mt-12 max-w-xl">
          <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-card p-8 text-center shadow-xl shadow-brand/5 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-brand/10 blur-3xl"
            />

            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
              Per appointment
            </span>

            <div className="mt-6 flex items-end justify-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                PKR
              </span>
              <span className="text-6xl font-bold tracking-tight text-foreground sm:text-7xl">
                50
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              per confirmed appointment
            </p>

            <div className="mx-auto mt-8 max-w-md space-y-3 text-left">
              {[
                'No setup fee',
                'No monthly fee',
                'Cancel anytime',
                'Free 14-day trial — no credit card',
              ].map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check className="size-3" />
                  </span>
                  {p}
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <InfinityIcon className="size-3.5 text-brand" />
              <span>
                Note: Clinics may add their own service fee on top.
              </span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
