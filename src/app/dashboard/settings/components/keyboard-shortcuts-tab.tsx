'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Keyboard } from 'lucide-react'
import { ShortcutsReference, type ShortcutSection } from '@/components/shortcuts-reference'

export function getShortcutSections(userType: string): ShortcutSection[] {
  const sections: ShortcutSection[] = []

  sections.push({
    title: 'Everywhere',
    shortcuts: [
      { key: 'h', description: 'Home / Overview' },
      { key: 'a', description: 'Appointments' },
      { key: 'p', description: 'Patients' },
      { key: 'c', description: 'Conversations' },
      { key: 's', description: 'Settings' },
      { key: '.', description: 'Add New (contextual)' },
    ],
  })

  if (userType === 'clinic_admin') {
    sections.push({
      title: 'Clinic Admin',
      shortcuts: [
        { key: 'd', description: 'Doctors' },
        { key: 'r', description: 'Receptionists' },
        { key: 'v', description: 'Services' },
        { key: 'w', description: 'WhatsApp' },
        { key: 'b', description: 'Billing & Wallet' },
        { key: 'g', description: 'Agent Chat Test' },
        { key: 'm', description: 'Reminders' },
        { key: 't', description: 'Message Templates' },
        { key: 'q', description: 'Quick Replies' },
        { key: 'k', description: 'Booking Links' },
        { key: 'e', description: 'Doctor Performance' },
        { key: 'f', description: 'Patient Feedback' },
        { key: 'o', description: 'Automation Rules' },
        { key: 'n', description: 'Campaigns' },
        { key: '/', description: 'Analytics' },
      ],
    })
  } else if (userType === 'doctor') {
    sections.push({
      title: 'Doctor',
      shortcuts: [
        { key: 'd', description: "Today's Queue" },
        { key: 'l', description: 'Calendar' },
      ],
    })
  } else if (userType === 'receptionist') {
    sections.push({
      title: 'Receptionist',
      shortcuts: [
        { key: 'k', description: 'Book Appointment' },
        { key: 'y', description: 'Payments' },
      ],
    })
  } else if (userType === 'platform_admin') {
    sections.push({
      title: 'Platform Admin',
      shortcuts: [
        { key: 'l', description: 'Clinics' },
        { key: 'y', description: 'LLM Keys' },
        { key: 'i', description: 'Pricing Rules' },
        { key: 'u', description: 'Audit Log' },
        { key: '/', description: 'Platform Analytics' },
      ],
    })
  } else if (userType === 'platform_staff') {
    sections.push({
      title: 'Platform Staff',
      shortcuts: [
        { key: 'l', description: 'Clinics' },
        { key: '/', description: 'Platform Analytics' },
      ],
    })
  }

  return sections
}

export function KeyboardShortcutsTab({ userType }: { userType: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Keyboard className="w-4 h-4 text-brand" />Keyboard Shortcuts</CardTitle>
        <CardDescription>Speed up your workflow. Hold <strong>Alt</strong> and press the key shown. Works everywhere except when typing in a field.</CardDescription>
      </CardHeader>
      <CardContent>
        <ShortcutsReference sections={getShortcutSections(userType)} />
      </CardContent>
    </Card>
  )
}
