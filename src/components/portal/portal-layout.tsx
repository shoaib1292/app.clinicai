'use client'

import { usePathname } from 'next/navigation'
import { PortalBottomTabs } from './portal-bottom-tabs'
import { PortalTopBar } from './portal-top-bar'
import { useBranding } from './branding-provider'

export function PortalLayout({
  children,
  basePath,
  onLogout,
}: {
  children: React.ReactNode
  basePath: string
  onLogout?: () => void
}) {
  const { bodyFont, headingFont } = useBranding()

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{
        fontFamily: bodyFont ? `'${bodyFont}', system-ui, sans-serif` : undefined,
        ['--font-heading' as string]: headingFont ? `'${headingFont}', system-ui, sans-serif` : undefined,
      }}
    >
      <PortalTopBar onLogout={onLogout} />
      <main className="flex-1 pb-20 max-w-md mx-auto w-full px-4 py-4">
        {children}
      </main>
      <PortalBottomTabs basePath={basePath} />
    </div>
  )
}
