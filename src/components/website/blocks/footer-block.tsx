import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { BlockProps } from './types'

export function FooterBlock({ clinic }: BlockProps) {
  const social = clinic.socialLinks ? (() => { try { return JSON.parse(clinic.socialLinks) } catch { return null } })() : null

  return (
    <footer className="py-12 px-4 border-t" style={{ background: 'var(--website-surface)', borderColor: 'var(--website-border)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  className="text-sm font-bold text-white"
                  style={{ background: 'var(--website-primary)' }}>
                  {clinic.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
                {clinic.name}
              </span>
            </div>
            {clinic.tagline && (
              <p className="text-sm text-muted-foreground">{clinic.tagline}</p>
            )}
            {social && (
              <div className="flex gap-2 pt-1">
                {social.facebook && (
                  <a href={social.facebook} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full"
                      style={{ background: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
                      f
                    </Button>
                  </a>
                )}
                {social.instagram && (
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full"
                      style={{ background: 'var(--website-primary-light)', color: 'var(--website-primary)' }}>
                      ig
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--website-text)' }}>Quick Links</h4>
            <div className="space-y-2 text-sm">
              {['Home', 'About', 'Doctors', 'Contact'].map(link => (
                <a key={link} href={`/${link.toLowerCase()}`} className="block text-muted-foreground hover:underline hover:text-foreground transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'var(--website-text)' }}>Contact</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              {clinic.address && <p>{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}</p>}
              {clinic.phone && (
                <Button variant="link" className="font-semibold h-auto p-0 text-sm" style={{ color: 'var(--website-primary)' }} asChild>
                  <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>
                </Button>
              )}
              <div>
                <Button variant="link" className="font-semibold h-auto p-0 text-sm" style={{ color: 'var(--website-primary)' }} asChild>
                  <a href={`/p/${clinic.slug}/book`}>Book Appointment</a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-6" style={{ backgroundColor: 'var(--website-border)' }} />

        <div className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {clinic.name}. All rights reserved. Powered by{' '}
          <a href="https://clinicai.pk" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: 'var(--website-primary)' }}>ClinicAI</a>.
        </div>
      </div>
    </footer>
  )
}
