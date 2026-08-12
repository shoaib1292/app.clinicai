'use client'

import { createContext, useContext, useMemo } from 'react'

interface BrandingConfig {
  primaryColor: string
  secondaryColor: string
  clinicName: string
  logoUrl: string | null
  headingFont: string | null
  bodyFont: string | null
}

const BrandingContext = createContext<BrandingConfig>({
  primaryColor: '#111111',
  secondaryColor: '#333333',
  clinicName: 'Clinic',
  logoUrl: null,
  headingFont: null,
  bodyFont: null,
})

export function useBranding() {
  return useContext(BrandingContext)
}

export function BrandingProvider({
  children,
  clinic,
}: {
  children: React.ReactNode
  clinic: {
    name: string
    logoUrl: string | null
    brandingPrimaryColor: string | null
    brandingSecondaryColor: string | null
    brandColor?: string | null
    headingFont?: string | null
    bodyFont?: string | null
  }
}) {
  const config = useMemo<BrandingConfig>(
    () => {
      // Website builder brand color wins; portal-specific color is fallback.
      // This keeps the portal visually identical to the clinic's website.
      const primaryColor = clinic.brandColor || clinic.brandingPrimaryColor || '#111111'
      const secondaryColor = clinic.brandingSecondaryColor || clinic.brandColor || '#333333'
      return {
        primaryColor,
        secondaryColor,
        clinicName: clinic.name,
        logoUrl: clinic.logoUrl,
        headingFont: clinic.headingFont || null,
        bodyFont: clinic.bodyFont || null,
      }
    },
    [clinic]
  )

  return (
    <BrandingContext.Provider value={config}>
      <div
        style={
          {
            '--portal-primary': config.primaryColor,
            '--portal-primary-light': config.primaryColor + '1a',
            '--portal-secondary': config.secondaryColor,
            // Mirror website brand tokens so the portal feels like the same product
            '--website-primary': config.primaryColor,
            '--website-primary-light': `color-mix(in srgb, ${config.primaryColor} 12%, transparent)`,
            '--website-font-heading': config.headingFont ? `'${config.headingFont}', sans-serif` : undefined,
            '--website-font': config.bodyFont ? `'${config.bodyFont}', sans-serif` : undefined,
            fontFamily: config.bodyFont ? `'${config.bodyFont}', system-ui, sans-serif` : undefined,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </BrandingContext.Provider>
  )
}
