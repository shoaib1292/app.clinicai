import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone } from 'lucide-react'
import type { BlockProps } from './types'

export function AboutBlock({ clinic, content }: BlockProps) {
  const ai = content || {}
  const title = ai.title || `About ${clinic.name}`
  const body = ai.body || clinic.description || `${clinic.name} is committed to providing exceptional healthcare to our community. Our team of experienced doctors and medical professionals work together to ensure you receive the best possible care.`

  if (!body) return null

  return (
    <section className="py-20 px-4" style={{ background: 'var(--website-bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: Clinic card */}
          <div className="lg:w-2/5 w-full">
            <div className="relative group">
              <Card className="overflow-hidden border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className="w-full aspect-[4/3] flex items-center justify-center relative"
                    style={{ background: `linear-gradient(135deg, var(--website-primary-light), var(--website-primary))` }}>
                    {clinic.logoUrl ? (
                      <img src={clinic.logoUrl} alt={clinic.name} className="w-32 h-32 object-contain relative z-10" />
                    ) : (
                      <div className="text-center text-white relative z-10">
                        <div className="text-6xl font-bold mb-2" style={{ fontFamily: 'var(--website-font-heading)' }}>{clinic.name.charAt(0)}</div>
                        <div className="text-sm opacity-80">{clinic.city || 'Welcome'}</div>
                      </div>
                    )}
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                  </div>
                </CardContent>
              </Card>
              {/* Moving shadow effect */}
              <div className="absolute -bottom-3 -right-3 w-full h-full rounded-2xl -z-10 opacity-20 transition-all duration-300 group-hover:opacity-30 group-hover:-translate-x-1 group-hover:translate-y-1"
                style={{ background: 'var(--website-primary)', transform: 'rotate(-3deg)' }} />
            </div>
          </div>

          {/* Right: Content */}
          <div className="lg:w-3/5 space-y-6">
            <Badge variant="secondary" className="gap-1.5 font-semibold">About Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight"
              style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
              {title}
            </h2>
            <div className="space-y-4 leading-relaxed text-base text-muted-foreground">
              {body.split('\n\n').map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Quick info grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {clinic.address && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--website-text)' }}>Location</p>
                    <p className="text-sm text-muted-foreground">{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}</p>
                  </div>
                </div>
              )}
              {clinic.phone && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--website-text)' }}>Phone</p>
                    <p className="text-sm text-muted-foreground">{clinic.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
