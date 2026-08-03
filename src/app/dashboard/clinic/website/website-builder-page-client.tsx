'use client'

import { useState } from 'react'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { WebsiteBuilderClient } from './website-client'

export function WebsiteBuilderPageClient({
  clinicId,
  clinicName,
  userName,
}: {
  clinicId: string
  clinicName: string
  userName: string
}) {
  const [immersive, setImmersive] = useState(true)

  return (
    <DashboardShell
      userType="clinic_admin"
      userName={userName}
      clinicName={clinicName}
      navItems={clinicAdminNav}
      immersive={immersive}
      onExitImmersive={() => setImmersive(false)}
    >
      <WebsiteBuilderClient
        clinicId={clinicId}
        immersive={immersive}
        onEnterImmersive={() => setImmersive(true)}
        onExitImmersive={() => setImmersive(false)}
      />
    </DashboardShell>
  )
}
