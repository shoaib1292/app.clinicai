import { SectionWrapper } from './shared/section-wrapper'
import { EditableText } from './shared/editable-text'
import { getImageUrl } from '@/lib/image-url'
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function Footer({ clinic }: BlockProps) {
  const socialLinks = clinic.socialLinks ? (() => { try { return JSON.parse(clinic.socialLinks) } catch { return null } })() : null

  return (
    <footer style={{ backgroundColor: 'var(--website-surface)' }}>
      <SectionWrapper bg="none" spacing="compact">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {clinic.logoKey ? (
                <img src={getImageUrl(clinic.logoKey, 100)} alt={clinic.name} className="h-10 w-auto" />
              ) : (
                <span className="text-xl font-bold" style={{ color: 'var(--website-text)' }}>{clinic.name}</span>
              )}
            </div>
            {clinic.tagline && (
              <EditableText
                tagName="p"
                value={clinic.tagline}
                blockId="footer"
                fieldName="tagline"
                className="text-sm"
                style={{ color: 'var(--website-text-muted)' }}
              />
            )}
            {socialLinks && (
              <div className="flex gap-3 mt-4">
                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}><Facebook className="h-4 w-4" /></a>}
                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}><Instagram className="h-4 w-4" /></a>}
                {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}><Twitter className="h-4 w-4" /></a>}
                {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--website-primary-light)', color: 'var(--website-primary)' }}><Linkedin className="h-4 w-4" /></a>}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--website-text)' }}>Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="/" className="text-sm hover:underline" style={{ color: 'var(--website-text-muted)' }}>Home</a></li>
              <li><a href="/about" className="text-sm hover:underline" style={{ color: 'var(--website-text-muted)' }}>About</a></li>
              <li><a href="/doctors" className="text-sm hover:underline" style={{ color: 'var(--website-text-muted)' }}>Doctors</a></li>
              <li><a href="/contact" className="text-sm hover:underline" style={{ color: 'var(--website-text-muted)' }}>Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--website-text)' }}>Contact</h4>
            {clinic.address && <p className="text-sm mb-2" style={{ color: 'var(--website-text-muted)' }}>{clinic.address}</p>}
            {clinic.phone && <a href={`tel:${clinic.phone}`} className="text-sm block mb-1 font-medium" style={{ color: 'var(--website-primary)' }}>{clinic.phone}</a>}
            <a href={`/p/${clinic.slug}/book`} className="text-sm font-medium" style={{ color: 'var(--website-primary)' }}>Book Appointment →</a>
          </div>
        </div>

        <div className="text-center pt-8" style={{ borderTop: `1px solid var(--website-border)` }}>
          <p className="text-xs" style={{ color: 'var(--website-text-muted)' }}>
            &copy; {new Date().getFullYear()} {clinic.name}. Powered by <a href="https://clinicai.pk" className="font-medium" style={{ color: 'var(--website-primary)' }} target="_blank" rel="noopener">ClinicAI</a>
          </p>
        </div>
      </SectionWrapper>
    </footer>
  )
}

registerBlock({ id: 'footer', label: 'Footer', category: 'info', component: Footer, defaultContent: {}, description: 'Multi-column site footer with brand, links, contact, and social icons.', requiredData: ['clinic.name'] })
export { Footer }
