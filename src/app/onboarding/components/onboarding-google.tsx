'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GoogleIcon } from '@/components/ui/icons'
import { Calendar, Video, Mail, HardDrive, Users, Store } from 'lucide-react'

const features = [
  { key: 'calendar', label: 'Calendar Sync', description: 'Two-way sync with Google Calendar', icon: Calendar },
  { key: 'meet', label: 'Google Meet', description: 'Auto-generate Meet links for telemedicine', icon: Video },
  { key: 'gmail', label: 'Gmail', description: 'Send emails from your Gmail address', icon: Mail },
  { key: 'drive', label: 'Drive', description: 'Store patient documents', icon: HardDrive },
  { key: 'contacts', label: 'Contacts', description: 'Sync patients to Google Contacts', icon: Users },
  { key: 'business', label: 'Business Profile', description: 'Manage your Google Business Profile', icon: Store },
]

interface Props {
  data: { googleConnected: boolean }
  onChange: (patch: Partial<Props['data']>) => void
  clinicId: string
}

export function OnboardingGoogle({ data, onChange, clinicId }: Props) {
  async function connect() {
    window.location.href = `/api/auth/google-redirect?clinicId=${clinicId}&from=onboarding`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Connect Google</h2>
        <p className="text-muted-foreground text-sm">
          Sync with Google Calendar, Meet, Gmail, Drive, and more.
        </p>
      </div>

      <Card className="bg-muted/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <GoogleIcon />
            <div>
              <div className="font-bold text-lg">Google Integration</div>
              <div className="text-sm text-muted-foreground">Connect your Google account to unlock powerful features</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {features.map((f) => (
              <div key={f.key} className="flex items-center gap-2 p-2 rounded bg-background/50 text-sm">
                <f.icon className="size-3.5 text-muted-foreground shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          <Button onClick={connect} variant="outline" className="w-full">
            <GoogleIcon />
            <span className="ml-2">Connect Google Account</span>
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            You can also connect Google later from Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
