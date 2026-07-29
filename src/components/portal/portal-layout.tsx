'use client'

import { usePathname } from 'next/navigation'
import { PortalBottomTabs } from './portal-bottom-tabs'
import { PortalTopBar } from './portal-top-bar'

export function PortalLayout({
  children,
  basePath,
  onLogout,
}: {
  children: React.ReactNode
  basePath: string
  onLogout?: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PortalTopBar onLogout={onLogout} />
      <main className="flex-1 pb-20 max-w-md mx-auto w-full px-4 py-4">
        {children}
      </main>
      <PortalBottomTabs basePath={basePath} />
    </div>
  )
}
