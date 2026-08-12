'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2, Building2, Stethoscope, UserCog, Activity,
  Smartphone, Wallet, Globe, Pill, FlaskConical, CreditCard,
  ArrowRight, Sparkles, Calendar
} from 'lucide-react'

interface Props {
  data: any
  totalSteps: number
  onComplete: () => void
  clinicId: string
  clinicName: string
}

export function OnboardingReview({ data, totalSteps, onComplete, clinicId, clinicName }: Props) {
  const completedItems: { label: string; icon: any; details: string; color: string }[] = []

  // Step 1
  if (data.address || data.workingHours || data.logoFile) {
    completedItems.push({
      label: 'Clinic Details',
      icon: Building2,
      details: [data.address, data.workingHours ? 'Working hours set' : '', data.logoFile ? 'Logo ready' : ''].filter(Boolean).join(' · '),
      color: 'text-blue-600',
    })
  }

  // Step 2
  if (data.isDoctor) {
    completedItems.push({
      label: 'Doctor Profile',
      icon: Stethoscope,
      details: 'You added yourself as a doctor',
      color: 'text-emerald-600',
    })
  }

  // Step 3
  if (data.staff?.length > 0) {
    const docs = data.staff.filter((s: any) => s.type === 'doctor').length
    const recs = data.staff.filter((s: any) => s.type === 'receptionist').length
    completedItems.push({
      label: 'Staff',
      icon: UserCog,
      details: [docs > 0 ? `${docs} doctor${docs > 1 ? 's' : ''}` : '', recs > 0 ? `${recs} receptionist${recs > 1 ? 's' : ''}` : ''].filter(Boolean).join(', '),
      color: 'text-purple-600',
    })
  }

  // Lab Staff (if lab enabled)
  if (data.labStaff?.length > 0) {
    completedItems.push({
      label: 'Lab Staff',
      icon: FlaskConical,
      details: `${data.labStaff.length} lab technician${data.labStaff.length > 1 ? 's' : ''}`,
      color: 'text-purple-600',
    })
  }

  // Step 4
  if (data.services?.length > 0) {
    completedItems.push({
      label: 'Services',
      icon: Activity,
      details: `${data.services.length} service${data.services.length > 1 ? 's' : ''} configured`,
      color: 'text-amber-600',
    })
  }

  // Step 5
  const features: string[] = []
  if (data.pharmacyEnabled) features.push('Pharmacy')
  if (data.labEnabled) features.push('Lab')
  if (data.onlinePaymentsEnabled) features.push('Online Payments')
  if (features.length > 0) {
    completedItems.push({
      label: 'Features',
      icon: Sparkles,
      details: features.join(', '),
      color: 'text-rose-600',
    })
  }

  // Step 6
  if (data.bankAccounts?.length > 0) {
    completedItems.push({
      label: 'Bank Accounts',
      icon: Wallet,
      details: `${data.bankAccounts.length} account${data.bankAccounts.length > 1 ? 's' : ''} added`,
      color: 'text-cyan-600',
    })
  }

  // Step 7
  if (data.whatsappConnected) {
    completedItems.push({
      label: 'WhatsApp',
      icon: Smartphone,
      details: 'Connected',
      color: 'text-emerald-600',
    })
  }

  // Step 8
  if (data.googleConnected) {
    completedItems.push({
      label: 'Google',
      icon: Globe,
      details: 'Connected',
      color: 'text-blue-600',
    })
  }

  const skipped = totalSteps - completedItems.length - 1 // review itself

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Review & Finish</h2>
        <p className="text-muted-foreground text-sm">
          Here's a summary of everything you've configured. You can always make changes later from Settings.
        </p>
      </div>

      {/* Completed items */}
      <div className="space-y-2">
        {completedItems.map((item) => (
          <Card key={item.label} className="overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className={`size-5 shrink-0 ${item.color}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground truncate">{item.details}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skipped items */}
      {skipped > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {skipped} step{skipped > 1 ? 's' : ''} skipped — you can set these up anytime from{' '}
              <strong>Settings</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Next steps */}
      <Card className="bg-brand/5 border-brand/20">
        <CardContent className="p-5 space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            What's next after onboarding?
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Calendar className="size-4 shrink-0 mt-0.5 text-brand" />
              Set up doctor schedules for online booking
            </li>
            <li className="flex items-start gap-2">
              <Smartphone className="size-4 shrink-0 mt-0.5 text-brand" />
              Connect WhatsApp for AI-powered patient replies
            </li>
            <li className="flex items-start gap-2">
              <Globe className="size-4 shrink-0 mt-0.5 text-brand" />
              Build your clinic website with our drag-and-drop builder
            </li>
          </ul>
        </CardContent>
      </Card>

      <Button onClick={onComplete} size="lg" className="w-full">
        Go to Dashboard <ArrowRight className="size-4 ml-1.5" />
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Setting up {clinicName} on ClinicAI
      </p>
    </div>
  )
}
