import { ReactNode } from 'react'
import { WebsiteHeader } from './website-header'
import type { ClinicWebsiteData } from './blocks/types'

// Google Fonts URL per font family (CSS2 API, limited to the families the builder offers)
const GOOGLE_FONTS: Record<string, string> = {
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap',
  'Geist': 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap',
  'DM Sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap',
  'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
}

const FONT_STACKS: Record<string, { heading: string; body: string }> = {
  'Inter': { heading: `'Inter', system-ui, sans-serif`, body: `'Inter', system-ui, sans-serif` },
  'Poppins': { heading: `'Poppins', system-ui, sans-serif`, body: `'Poppins', system-ui, sans-serif` },
  'Playfair Display': { heading: `'Playfair Display', Georgia, serif`, body: `'Playfair Display', Georgia, serif` },
  'Geist': { heading: `'Geist', system-ui, sans-serif`, body: `'Geist', system-ui, sans-serif` },
  'DM Sans': { heading: `'DM Sans', system-ui, sans-serif`, body: `'DM Sans', system-ui, sans-serif` },
  'Space Grotesk': { heading: `'Space Grotesk', system-ui, sans-serif`, body: `'Space Grotesk', system-ui, sans-serif` },
}

interface WebsiteLayoutProps {
  clinic: ClinicWebsiteData
  children: ReactNode
}

export function WebsiteLayout({ clinic, children }: WebsiteLayoutProps) {
  const brandColor = clinic.brandColor || '#111111'
  const headingFont = clinic.headingFont || 'Inter'
  const bodyFont = clinic.bodyFont || 'Inter'

  // Build Google Fonts <link> tags for the selected fonts
  const fontLinks = [...new Set([headingFont, bodyFont])]
    .filter(f => GOOGLE_FONTS[f])
    .map(f => GOOGLE_FONTS[f])

  const headingStack = FONT_STACKS[headingFont]?.heading || `'${headingFont}', sans-serif`
  const bodyStack = FONT_STACKS[bodyFont]?.body || `'${bodyFont}', sans-serif`

  return (
    <>
      {fontLinks.map(href => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <div
        style={{
          '--website-primary': brandColor,
          '--website-primary-light': `color-mix(in srgb, ${brandColor} 12%, transparent)`,
          '--website-bg': '#ffffff',
          '--website-surface': '#f8f9fa',
          '--website-text': '#111827',
          '--website-text-muted': '#6b7280',
          '--website-border': '#e5e7eb',
          '--website-shadow': '0 1px 3px rgba(0,0,0,0.08)',
          '--website-shadow-lg': '0 10px 40px rgba(0,0,0,0.1)',
          '--website-radius': '1rem',
          '--website-font-heading': headingStack,
          '--website-font': bodyStack,
          fontFamily: 'var(--website-font)',
          background: 'var(--website-bg)',
          color: 'var(--website-text)',
        } as React.CSSProperties}
        className="min-h-screen flex flex-col antialiased"
      >
        <WebsiteHeader clinic={clinic} />
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}
