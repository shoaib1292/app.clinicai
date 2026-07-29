'use client'

import { useRouter } from 'next/navigation'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LayoutDashboard, Building2, Users, CalendarDays, Stethoscope, MessageSquare, Bot, Wallet, BarChart3, Settings, Bell, KeyRound, CreditCard, UserCog, CalendarCheck, Activity, ShieldAlert, Receipt, Search, Pill, PackageSearch, Truck, FileText, ShoppingCart } from 'lucide-react'

interface QuickLink {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group: string
  shortcut?: string
}

const PHARMACY_LINK_FEATURE: Record<string, string> = {
  '/dashboard/pharmacy/medicines': 'pharmacy',
  '/dashboard/pharmacy/inventory': 'inventory',
  '/dashboard/pharmacy/suppliers': 'suppliers',
  '/dashboard/pharmacy/prescriptions': 'prescriptions',
  '/dashboard/pharmacy/counter': 'counter',
  '/dashboard/pharmacy/reports': 'reports',
}

const platformLinks: QuickLink[] = [
  { label: 'Overview', href: '/dashboard/platform', icon: LayoutDashboard, group: 'Platform', shortcut: 'Alt+H' },
  { label: 'Clinics', href: '/dashboard/platform/clinics', icon: Building2, group: 'Platform', shortcut: 'Alt+L' },
  { label: 'LLM Keys', href: '/dashboard/platform/llm-keys', icon: KeyRound, group: 'Platform', shortcut: 'Alt+Y' },
  { label: 'Pricing Rules', href: '/dashboard/platform/pricing', icon: CreditCard, group: 'Platform', shortcut: 'Alt+I' },
  { label: 'Platform Staff', href: '/dashboard/platform/staff', icon: UserCog, group: 'Platform' },
  { label: 'Platform Calendar', href: '/dashboard/platform/calendar', icon: CalendarCheck, group: 'Platform' },
  { label: 'Analytics', href: '/dashboard/platform/analytics', icon: BarChart3, group: 'Platform' },
  { label: 'Audit Log', href: '/dashboard/platform/audit', icon: ShieldAlert, group: 'Platform' },
]

const clinicLinks: QuickLink[] = [
  { label: 'Overview', href: '/dashboard/clinic', icon: LayoutDashboard, group: 'Clinic', shortcut: 'Alt+H' },
  { label: 'Doctors', href: '/dashboard/clinic/doctors', icon: Stethoscope, group: 'Clinic', shortcut: 'Alt+D' },
  { label: 'Receptionists', href: '/dashboard/clinic/receptionists', icon: UserCog, group: 'Clinic', shortcut: 'Alt+R' },
  { label: 'Services', href: '/dashboard/clinic/services', icon: Activity, group: 'Clinic', shortcut: 'Alt+V' },
  { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays, group: 'Clinic', shortcut: 'Alt+A' },
  { label: 'Patients', href: '/dashboard/patients', icon: Users, group: 'Clinic', shortcut: 'Alt+P' },
  { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare, group: 'Clinic', shortcut: 'Alt+C' },
  { label: 'Agent Chat Test', href: '/dashboard/agent-chat', icon: Bot, group: 'Clinic', shortcut: 'Alt+G' },
  { label: 'Reminders', href: '/dashboard/reminders', icon: Bell, group: 'Clinic', shortcut: 'Alt+M' },
  { label: 'Agent Persona', href: '/dashboard/clinic/agent', icon: Bot, group: 'Clinic' },
  { label: 'Bank Accounts', href: '/dashboard/clinic/bank-accounts', icon: Wallet, group: 'Clinic' },
  { label: 'Billing & Wallet', href: '/dashboard/billing', icon: Receipt, group: 'Clinic', shortcut: 'Alt+B' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, group: 'Clinic', shortcut: 'Alt+/' },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, group: 'Clinic', shortcut: 'Alt+S' },
  { label: 'Payments', href: '/dashboard/payments', icon: Wallet, group: 'Clinic', shortcut: 'Alt+Y' },
  { label: 'Medicines', href: '/dashboard/pharmacy/medicines', icon: Pill, group: 'Pharmacy' },
  { label: 'Inventory', href: '/dashboard/pharmacy/inventory', icon: PackageSearch, group: 'Pharmacy' },
  { label: 'Suppliers & Purchases', href: '/dashboard/pharmacy/suppliers', icon: Truck, group: 'Pharmacy' },
  { label: 'Prescriptions', href: '/dashboard/pharmacy/prescriptions', icon: FileText, group: 'Pharmacy' },
  { label: 'Pharmacy Counter', href: '/dashboard/pharmacy/counter', icon: ShoppingCart, group: 'Pharmacy' },
  { label: 'Pharmacy Reports', href: '/dashboard/pharmacy/reports', icon: BarChart3, group: 'Pharmacy' },
]

const financeLinks: QuickLink[] = [
  { label: 'Payment Proofs', href: '/dashboard/finance/proofs', icon: Wallet, group: 'Finance' },
  { label: 'Credit Ledger', href: '/dashboard/finance/ledger', icon: Receipt, group: 'Finance' },
  { label: 'Invoices', href: '/dashboard/finance/invoices', icon: CreditCard, group: 'Finance' },
]

export function CommandPalette({ userType, open, onOpenChange, enabledFeatures }: { userType: 'platform_admin' | 'platform_staff' | 'clinic_admin' | 'doctor' | 'receptionist'; open: boolean; onOpenChange: (o: boolean) => void; enabledFeatures?: Set<string> }) {
  const router = useRouter()

  const links: QuickLink[] = [
    ...(userType === 'platform_admin' || userType === 'platform_staff' ? platformLinks : []),
    ...(userType === 'clinic_admin' || userType === 'doctor' || userType === 'receptionist' ? clinicLinks : []),
    ...(userType === 'platform_staff' ? financeLinks : []),
    ...(userType === 'clinic_admin' ? financeLinks : []),
  ].filter((l) => !enabledFeatures || !l.href.startsWith('/dashboard/pharmacy/') || enabledFeatures.has(PHARMACY_LINK_FEATURE[l.href] ?? 'pharmacy'))

  // Group by group name
  const groups = links.reduce((acc, link) => {
    if (!acc[link.group]) acc[link.group] = []
    acc[link.group].push(link)
    return acc
  }, {} as Record<string, QuickLink[]>)

  function run(link: QuickLink) {
    router.push(link.href)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-xl max-w-2xl" style={{ top: '20%' }}>
        <Command className="rounded-lg">
          <CommandInput placeholder="Type a command or search pages..." />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(groups).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((link) => {
                  const Icon = link.icon
                  return (
                    <CommandItem key={link.href} value={`${link.label} ${link.group}`} onSelect={() => run(link)} className="cursor-pointer">
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{link.label}</span>
                      {link.shortcut && <CommandShortcut>{link.shortcut}</CommandShortcut>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup heading="Help">
              <CommandItem onSelect={() => { router.push('/'); onOpenChange(false) }} className="cursor-pointer">
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Back to public site</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
