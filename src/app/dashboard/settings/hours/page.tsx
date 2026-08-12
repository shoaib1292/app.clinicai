'use client'

import { useParams } from 'next/navigation'

export default function SettingsHoursPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Working Hours</h1>
        <p className="text-muted-foreground">Set your clinic's default working hours for each day.</p>
      </div>
      <p className="text-sm text-muted-foreground">Use the settings page to configure working hours.</p>
    </div>
  )
}
