'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { LayoutDashboard, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clinic: 'Clinic',
  analytics: 'Analytics',
  appointments: 'Appointments',
  patients: 'Patients',
  conversations: 'Conversations',
  doctors: 'Doctors',
  receptionists: 'Receptionists',
  services: 'Services',
  'agent-chat': 'Agent Chat',
  reminders: 'Reminders',
  'booking-links': 'Booking Links',
  agent: 'Agent Persona',
  'quick-replies': 'Quick Replies',
  'bank-accounts': 'Bank Accounts',
  billing: 'Billing & Wallet',
  'doctor-performance': 'Doctor Performance',
  feedback: 'Patient Feedback',
  settings: 'Settings',
  payments: 'Payments',
  platform: 'Platform',
  'llm-keys': 'LLM Keys',
  pricing: 'Pricing Rules',
  staff: 'Platform Staff',
  calendar: 'Calendar',
  leads: 'Leads',
  audit: 'Audit Log',
  whatsapp: 'WhatsApp',
  'agent-chat-test': 'Agent Chat Test',
}

function labelFor(segment: string): string {
  return routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Only show breadcrumbs inside /dashboard
  if (!segments.includes('dashboard')) return null

  const dashboardIndex = segments.indexOf('dashboard')

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
      <Link
        href="/dashboard"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <LayoutDashboard className="size-4" />
      </Link>
      {segments.slice(dashboardIndex + 1).map((seg, i, arr) => (
        <Fragment key={seg}>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
          <span
            className={cn(
              'truncate capitalize',
              i === arr.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground transition-colors'
            )}
          >
            {i === arr.length - 1 ? (
              labelFor(seg)
            ) : (
              <Link
                href={'/dashboard/' + segments.slice(dashboardIndex + 1, dashboardIndex + 1 + i + 1).join('/')}
                className="hover:underline"
              >
                {labelFor(seg)}
              </Link>
            )}
          </span>
        </Fragment>
      ))}
    </nav>
  )
}
