'use client'

import * as React from 'react'
import { animate, motion, useInView } from 'framer-motion'
import { Building2, CalendarCheck, Send } from 'lucide-react'

type Stat = {
  value: number
  suffix?: string
  decimals?: number
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const stats: Stat[] = [
  { value: 40, suffix: '+', label: 'Clinics onboarded', icon: Building2 },
  {
    value: 12000,
    suffix: '+',
    label: 'Appointments handled',
    icon: CalendarCheck,
  },
  {
    value: 99.2,
    suffix: '%',
    decimals: 1,
    label: 'Reminder delivery',
    icon: Send,
  },
]

function CountUp({
  to,
  decimals = 0,
  suffix = '',
  duration = 1.6,
}: {
  to: number
  decimals?: number
  suffix?: string
  duration?: number
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [display, setDisplay] = React.useState('0')

  React.useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    })
    return () => controls.stop()
  }, [inView, to, decimals, duration])

  const formatted =
    decimals === 0
      ? Number(display).toLocaleString('en-PK')
      : display

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  )
}

export function TrustBar() {
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-3">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="flex items-center gap-4 md:justify-center"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-6" />
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  <CountUp
                    to={s.value}
                    decimals={s.decimals}
                    suffix={s.suffix}
                  />
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm">
                  {s.label}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
