'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { motion } from 'framer-motion'
import type { BlockProps, TestimonialItem } from './types'

export function TestimonialsBlock({ clinic, content }: BlockProps) {
  const testimonials: TestimonialItem[] = content?.testimonials || [
    { name: 'Sarah A.', text: 'Excellent care and very professional staff. Highly recommended!', rating: 5 },
    { name: 'Ahmed K.', text: 'The doctors are very experienced and the booking process is so easy.', rating: 5 },
    { name: 'Fatima R.', text: 'Clean facility, minimal wait time. Best clinic in the area.', rating: 4 },
  ]

  return (
    <section className="py-20 px-4" style={{ background: 'var(--website-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="gap-1.5 font-semibold mb-4">Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
            What Our Patients Say
          </h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            Real feedback from real patients who trust us with their health.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="border h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-8 relative">
                  {/* Large quote mark */}
                  <div className="absolute top-4 right-6 text-6xl leading-none opacity-[0.07] select-none"
                    style={{ color: 'var(--website-primary)', fontFamily: 'var(--website-font-heading)', fontStyle: 'normal' }}>
                    &#x201D;
                  </div>

                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-4 h-4"
                        fill={j < t.rating ? 'currentColor' : 'none'}
                        strokeWidth={1.5}
                        style={{ color: j < t.rating ? 'var(--website-primary)' : 'var(--website-border)' }}
                      />
                    ))}
                  </div>

                  <p className="text-sm leading-relaxed mb-6 italic text-muted-foreground min-h-[4rem]">
                    &ldquo;{t.text}&rdquo;
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--website-border)' }}>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback
                        className="text-sm font-semibold text-white"
                        style={{ background: `linear-gradient(135deg, var(--website-primary), color-mix(in srgb, var(--website-primary) 60%, #000))` }}>
                        {t.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--website-text)' }}>{t.name}</p>
                      <p className="text-xs text-muted-foreground">Verified Patient</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
