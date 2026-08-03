import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Calendar } from 'lucide-react'
import type { BlockProps } from './types'

export function ContactBlock({ clinic }: BlockProps) {
  return (
    <section className="py-20 px-4" style={{ background: 'var(--website-surface)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="gap-1.5 font-semibold mb-4">Get In Touch</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
            Contact Us
          </h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            We&apos;d love to hear from you. Reach out through any of the channels below.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinic.address && (
            <Card className="border text-center hover:-translate-y-1 hover:shadow-lg transition-all">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--website-primary-light)' }}>
                  <MapPin className="w-6 h-6" style={{ color: 'var(--website-primary)' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>Address</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {clinic.address}{clinic.city ? `, ${clinic.city}` : ''}
                </p>
              </CardContent>
            </Card>
          )}

          {clinic.phone && (
            <Card className="border text-center hover:-translate-y-1 hover:shadow-lg transition-all">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--website-primary-light)' }}>
                  <Phone className="w-6 h-6" style={{ color: 'var(--website-primary)' }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>Phone</h3>
                <Button variant="link" className="font-semibold h-auto p-0" style={{ color: 'var(--website-primary)' }} asChild>
                  <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border text-center hover:-translate-y-1 hover:shadow-lg transition-all">
            <CardContent className="p-8">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--website-primary-light)' }}>
                <Calendar className="w-6 h-6" style={{ color: 'var(--website-primary)' }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--website-text)' }}>Book Online</h3>
              <Button variant="link" className="font-semibold h-auto p-0" style={{ color: 'var(--website-primary)' }} asChild>
                <a href={`/p/${clinic.slug}/book`}>Schedule Appointment →</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
