'use client'

import { useBranding } from './branding-provider'
import { Bell, LogOut } from 'lucide-react'

export function PortalTopBar({ onLogout }: { onLogout?: () => void }) {
  const { clinicName, logoUrl } = useBranding()

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={clinicName} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'var(--portal-primary)' }}
            >
              {clinicName.charAt(0)}
            </div>
          )}
          <h1 className="text-sm font-semibold truncate">{clinicName}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
