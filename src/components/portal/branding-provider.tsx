'use client'

import { createContext, useContext, useMemo } from 'react'

interface BrandingConfig {
  primaryColor: string
  secondaryColor: string
  clinicName: string
  logoUrl: string | null
}

const BrandingContext = createContext<BrandingConfig>({
  primaryColor: '#0891b2',
  secondaryColor: '#06b6d4',
  clinicName: 'Clinic',
  logoUrl: null,
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
  }
}) {
  const config = useMemo<BrandingConfig>(
    () => ({
      primaryColor: clinic.brandingPrimaryColor || '#0891b2',
      secondaryColor: clinic.brandingSecondaryColor || '#06b6d4',
      clinicName: clinic.name,
      logoUrl: clinic.logoUrl,
    }),
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
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </BrandingContext.Provider>
  )
}
