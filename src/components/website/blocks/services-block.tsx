import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Heart, Stethoscope, Activity, Shield, Phone } from 'lucide-react'
import type { BlockProps, ServiceItem } from './types'

const iconMap: Record<string, React.ReactNode> = {
  general: <Stethoscope className="w-7 h-7" />,
  heart: <Heart className="w-7 h-7" />,
  cardio: <Heart className="w-7 h-7" />,
  dental: <Activity className="w-7 h-7" />,
  skin: <Shield className="w-7 h-7" />,
  surgery: <Activity className="w-7 h-7" />,
  pediatric: <Heart className="w-7 h-7" />,
  gynae: <Heart className="w-7 h-7" />,
  default: <Stethoscope className="w-7 h-7" />,
}

function getIcon(name: string): React.ReactNode {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lower.includes(key)) return icon
  }
  return iconMap.default
}

export function ServicesBlock({ clinic, content }: BlockProps) {
  const ai = content || {}
  const items: ServiceItem[] = Array.isArray(ai) ? ai : (ai.items || ai || [])

  return (
    <section className="py-20 px-4" style={{ background: 'var(--website-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="gap-1.5 font-semibold mb-4">What We Offer</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
            Our Services
          </h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            Comprehensive healthcare services tailored to your needs.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((s, i) => (
              <Card key={i} className="group border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
                    {getIcon(s.name)}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
                    {s.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.shortDescription}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--website-primary-light)' }}>
                <Shield className="w-8 h-8" style={{ color: 'var(--website-primary)' }} />
              </div>
              <p className="text-base text-muted-foreground">Comprehensive healthcare services tailored to your needs.</p>
              {clinic.phone && (
                <Button variant="link" className="mt-3" style={{ color: 'var(--website-primary)' }} asChild>
                  <a href={`tel:${clinic.phone}`}>
                    <Phone className="w-4 h-4 mr-1" /> Call {clinic.phone} to learn more
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
