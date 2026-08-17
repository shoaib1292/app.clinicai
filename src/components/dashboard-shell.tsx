'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Breadcrumbs } from '@/components/breadcrumbs'
import {
  LayoutDashboard, Building2, Users, CalendarDays, Stethoscope, PhoneCall,
  Wallet, BarChart3, Bot, MessageSquare, Settings, LogOut, Menu, KeyRound,
  Receipt, CreditCard, UserCog, CalendarCheck, Activity, ShieldAlert,
  Bell, Search, ChevronDown, Moon, Sun,
  Smartphone, ChevronRight, Sparkles, Send, Pill, PackageSearch, Truck, FileText, ShoppingCart, Mic, Monitor, Radio,
  FlaskConical, ClipboardList, Clock, ToggleLeft, Zap, Globe, Palette, Link as LinkIcon, Banknote, ArrowLeft,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { CommandPalette } from '@/components/command-palette'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { useKeyboardShortcuts, type ShortcutDefinition } from '@/hooks/use-keyboard-shortcuts'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export interface DashboardShellProps {
  userType: string
  userName: string
  clinicName?: string
  clinicLogoUrl?: string | null
  navItems: NavItem[]
  children: React.ReactNode
  enabledFeatures?: Set<string>
  immersive?: boolean
  onExitImmersive?: () => void
  settingsSidebar?: boolean
}

function organizeNavSections(items: NavItem[], userType: string): NavSection[] {
  if (items.length <= 8) {
    return [{ items }]
  }

  const overviewLabel = 'Overview'
  const overviewItem = items.find((i) => i.label === overviewLabel)

  // Define section maps per role
  const sectionDefinitions: Record<string, { title: string; labels: string[] }[]> = {
    clinic_admin: [
      { title: 'Operations', labels: ['Patients', 'Appointments', 'Conversations', 'AI Agent'] },
      { title: 'Growth', labels: ['Website', 'Offers & Referrals'] },
      { title: 'Finance', labels: ['Payments', 'Credits'] },
    ],
    settings: [
      { title: 'Settings', labels: ['Settings'] },
      { title: 'Team', labels: ['Doctors', 'Staff', 'Services'] },
      { title: 'Integrations', labels: ['WhatsApp'] },
      { title: 'Finance', labels: ['Bank Accounts'] },
      { title: 'Marketing', labels: ['Booking Links', 'Quick Replies', 'Reminders'] },
      { title: 'Insights', labels: ['Analytics'] },
    ],
    pharmacist: [
      { title: 'Pharmacy', labels: ['Pharmacy Counter', 'Medicines', 'Inventory', 'Prescriptions', 'Suppliers', 'Pharmacy Reports'] },
    ],
    lab_admin: [
      { title: 'Lab', labels: ['Lab Orders', 'Lab Tests', 'Lab Reports', 'Patients'] },
    ],
  }

  const sections = sectionDefinitions[userType] || []
  const used = new Set<string>()
  const result: NavSection[] = []

  // Overview first
  if (overviewItem) {
    result.push({ items: [overviewItem] })
    used.add(overviewLabel)
  }

  // Grouped sections
  for (const section of sections) {
    const sectionItems = items.filter((i) => section.labels.includes(i.label))
    if (sectionItems.length > 0) {
      result.push({ title: section.title, items: sectionItems })
      section.labels.forEach((l) => used.add(l))
    }
  }

  // Remaining items
  const remaining = items.filter((i) => !used.has(i.label) && i.label !== overviewLabel)
  if (remaining.length > 0) {
    result.push({ title: 'Other', items: remaining })
  }

  return result
}

/**
 * Filter nav items by the clinic's enabled feature toggles.
 * Each pharmacy sub-page is tagged with a feature key in PHARMACY_NAV_FEATURES.
 * If the clinic hasn't enabled pharmacy (or a specific sub-feature), those tabs
 * are removed entirely from the sidebar + command palette.
 */
const PHARMACY_NAV_FEATURES: Record<string, string> = {
  '/dashboard/pharmacy/medicines': 'pharmacy',
  '/dashboard/pharmacy/inventory': 'inventory',
  '/dashboard/pharmacy/suppliers': 'suppliers',
  '/dashboard/pharmacy/prescriptions': 'prescriptions',
  '/dashboard/pharmacy/counter': 'counter',
  '/dashboard/pharmacy/reports': 'reports',
}

export function filterNavByFeatures(
  items: NavItem[],
  enabledFeatures: Set<string>,
): NavItem[] {
  return items.filter((item) => {
    const required = PHARMACY_NAV_FEATURES[item.href]
    if (!required) return true
    return enabledFeatures.has(required)
  })
}

export const pharmacyNav: NavItem[] = [
  { label: 'Medicines', href: '/dashboard/pharmacy/medicines', icon: Pill },
  { label: 'Inventory', href: '/dashboard/pharmacy/inventory', icon: PackageSearch },
  { label: 'Suppliers & Purchases', href: '/dashboard/pharmacy/suppliers', icon: Truck },
  { label: 'Prescriptions', href: '/dashboard/pharmacy/prescriptions', icon: FileText },
  { label: 'Pharmacy Counter', href: '/dashboard/pharmacy/counter', icon: ShoppingCart },
  { label: 'Pharmacy Reports', href: '/dashboard/pharmacy/reports', icon: BarChart3 },
]

export function DashboardShell({ userType, userName, clinicName, clinicLogoUrl, navItems, enabledFeatures, children, immersive, onExitImmersive, settingsSidebar }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [liveLogoUrl, setLiveLogoUrl] = useState<string | null | undefined>(clinicLogoUrl)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // If the page didn't pass enabledFeatures (most pages), resolve them
  // client-side for clinic-scoped roles so pharmacy tabs respect the toggle
  // without touching every page. Platform roles skip this.
  const [fetchedFeatures, setFetchedFeatures] = useState<Set<string> | undefined>(undefined)
  const resolvedFeatures = enabledFeatures ?? fetchedFeatures
  useEffect(() => {
    if (enabledFeatures) return
    if (userType !== 'clinic_admin' && userType !== 'doctor' && userType !== 'receptionist') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/clinic-features')
        const json = await res.json()
        if (cancelled || !json?.ok) return
        const rows = json.data as { key: string; enabled: boolean }[]
        const set = new Set<string>()
        for (const r of rows) if (r.enabled) set.add(r.key)
        // When pharmacy master is on, sub-features default on — but an explicit
        // enabled:false row (turned off by the user) must stay off. Only force
        // a sub on if there is NO row for it at all.
        if (set.has('pharmacy')) {
          for (const sub of ['inventory', 'suppliers', 'prescriptions', 'counter', 'reports']) {
            const hasRow = rows.some((r) => r.key === sub)
            if (!hasRow) set.add(sub)
          }
        }
        setFetchedFeatures(set)
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [enabledFeatures, userType])

  // When in settings mode, override the nav to settings sidebar
  const settingsActive = settingsSidebar || settingsOpen
  const displayNav = settingsActive ? settingsNav : navItems

  // Filter pharmacy tabs by enabled features + append the Pharmacy section.
  const effectiveNav = useMemo(() => {
    if (!resolvedFeatures) return displayNav
    const filtered = filterNavByFeatures(displayNav, resolvedFeatures)
    const pharmacyItems = filterNavByFeatures(pharmacyNav, resolvedFeatures)
    return [...filtered, ...pharmacyItems]
  }, [displayNav, resolvedFeatures])

  // Reset collapsed state when mobile Sheet closes (return to desktop)
  // Handled in the Sheet's onOpenChange handler above — no effect needed.

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  // For clinic-scoped users, resolve the clinic logo once on mount if not passed in.
  useEffect(() => {
    if (clinicLogoUrl !== undefined && clinicLogoUrl !== null) return
    if (userType !== 'clinic_admin' && userType !== 'doctor' && userType !== 'receptionist') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        const json = await res.json()
        if (cancelled || !json?.ok) return
        const url = (json.data as any)?.clinic?.logoUrl
        if (url) setLiveLogoUrl(url)
      } catch {
        /* ignore — brand logo fallback stays */
      }
    })()
    return () => { cancelled = true }
  }, [clinicLogoUrl, userType])

  // Keep the sidebar clinic logo in sync when it's uploaded/updated elsewhere.
  useEffect(() => {
    function onLogoUpdated(e: Event) {
      const url = (e as CustomEvent<string | null>).detail
      setLiveLogoUrl(url ?? null)
    }
    window.addEventListener('clinic-logo-updated', onLogoUpdated as EventListener)
    return () => window.removeEventListener('clinic-logo-updated', onLogoUpdated as EventListener)
  }, [])

  // ⌘K / Ctrl+K → command palette (keep separate from Alt shortcuts)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Role-based Alt keyboard shortcuts
  const shortcuts = useMemo<ShortcutDefinition[]>(() => {
    const common: ShortcutDefinition[] = [
      { key: 'a', description: 'Appointments', action: () => router.push('/dashboard/appointments') },
      { key: 'p', description: 'Patients', action: () => router.push('/dashboard/patients') },
      { key: 'c', description: 'Conversations', action: () => router.push('/dashboard/conversations') },
      { key: 's', description: 'Settings', action: () => router.push('/dashboard/settings') },
      { key: 'h', description: 'Home / Overview', action: () => {
        const homeMap: Record<string, string> = {
          clinic_admin: '/dashboard/clinic',
          doctor: '/dashboard/doctor',
          receptionist: '/dashboard/receptionist',
          platform_admin: '/dashboard/platform',
          platform_staff: '/dashboard/platform',
        }
        router.push(homeMap[userType] || '/dashboard/clinic')
      }},
      { key: '.', description: 'Add New (contextual)', action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:add'))
      }},
    ]

    const byRole: Record<string, ShortcutDefinition[]> = {
      clinic_admin: [
        { key: 'd', description: 'Doctors', action: () => router.push('/dashboard/clinic/doctors') },
        { key: 'r', description: 'Receptionists', action: () => router.push('/dashboard/clinic/receptionists') },
        { key: 'v', description: 'Services', action: () => router.push('/dashboard/clinic/services') },
        { key: 'w', description: 'WhatsApp', action: () => router.push('/dashboard/clinic/whatsapp') },
        { key: 'b', description: 'Billing & Wallet', action: () => router.push('/dashboard/billing') },
        { key: 'g', description: 'Agent Chat Test', action: () => router.push('/dashboard/agent-chat') },
        { key: 'm', description: 'Reminders', action: () => router.push('/dashboard/reminders') },
        { key: 'q', description: 'Quick Replies', action: () => router.push('/dashboard/clinic/quick-replies') },
        { key: 'k', description: 'Booking Links', action: () => router.push('/dashboard/clinic/booking-links') },
        { key: 'e', description: 'Doctor Performance', action: () => router.push('/dashboard/clinic/doctor-performance') },
        { key: 'f', description: 'Patient Feedback', action: () => router.push('/dashboard/clinic/feedback') },
        { key: '/', description: 'Analytics', action: () => router.push('/dashboard/analytics') },
      ],
      doctor: [
        { key: 'd', description: "Today's Queue", action: () => router.push('/dashboard/doctor') },
        { key: 'l', description: 'Calendar', action: () => router.push('/dashboard/doctor/calendar') },
      ],
      receptionist: [
        { key: 'k', description: 'Book Appointment', action: () => router.push('/dashboard/receptionist/book') },
        { key: 'y', description: 'Payments', action: () => router.push('/dashboard/payments') },
      ],
      platform_admin: [
        { key: 'l', description: 'Clinics', action: () => router.push('/dashboard/platform/clinics') },
        { key: 'y', description: 'LLM Keys', action: () => router.push('/dashboard/platform/llm-keys') },
        { key: 'i', description: 'Pricing Rules', action: () => router.push('/dashboard/platform/pricing') },
        { key: 'u', description: 'Audit Log', action: () => router.push('/dashboard/platform/audit') },
        { key: '/', description: 'Platform Analytics', action: () => router.push('/dashboard/platform/analytics') },
      ],
      platform_staff: [
        { key: 'l', description: 'Clinics', action: () => router.push('/dashboard/platform/clinics') },
        { key: '/', description: 'Platform Analytics', action: () => router.push('/dashboard/platform/analytics') },
      ],
    }

    return [...common, ...(byRole[userType] || [])]
  }, [userType, router])

  useKeyboardShortcuts(shortcuts)

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [userMenuOpen])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const typeLabel = {
    platform_admin: 'Platform Admin',
    platform_staff: 'Platform Staff',
    clinic_admin: 'Clinic Admin',
    doctor: 'Doctor',
    receptionist: 'Receptionist',
    pharmacist: 'Pharmacist',
    lab_admin: 'Lab Admin',
    accountant: 'Accountant',
  }[userType]

  // Use 'settings' pseudo-type for section grouping when settings sidebar is active
  const sectionUserType = settingsActive ? 'settings' : userType
  const sections = organizeNavSections(effectiveNav, sectionUserType)

  // ─── Immersive mode: full-viewport editor, no chrome ───
  // The client component owns its own exit button in its top bar.
  if (immersive) {
    return (
      <div className="h-screen overflow-hidden">
        {children}
      </div>
    )
  }

  function NavItemLink({ item }: { item: NavItem }) {
    const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          'border-l-2',
          active
            ? 'border-l-primary bg-primary/[0.07] text-primary'
            : 'border-l-transparent text-muted-foreground hover:bg-surface-3 hover:text-foreground'
        )}
      >
        <Icon className={cn(
          'size-4 shrink-0 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground/80'
        )} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary/10 text-2xs font-semibold text-primary">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  const SidebarContent = (
    <div className="flex flex-col h-full bg-card">
      {/* Logo area */}
      <div className="flex items-center px-4 h-14 shrink-0 border-b border-border/60">
        {liveLogoUrl ? (
          <img
            src={liveLogoUrl}
            alt={clinicName || 'Clinic'}
            className="h-8 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <img
            src={mounted && theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="ClinicAI"
            className="h-8 w-auto object-contain"
            suppressHydrationWarning
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto scroll-thin">
        {sections.map((section, si) => {
          const sectionKey = `section-${si}`
          // Collapse sections by default in mobile Sheet — never collapse in settings
          const defaultCollapsed = settingsActive ? false : open
          const isCollapsed = collapsedSections[sectionKey] ?? defaultCollapsed
          // Don't collapse sections with only 1 item
          const canCollapse = section.title && section.items.length > 1

          return (
            <div key={si}>
              {section.title ? (
                <button
                  onClick={() => canCollapse && setCollapsedSections((prev) => ({
                    ...prev,
                    [sectionKey]: !prev[sectionKey],
                  }))}
                  className={cn(
                    'flex w-full items-center justify-between px-3 pb-1',
                    canCollapse ? 'cursor-pointer group' : 'cursor-default'
                  )}
                >
                  <span className="text-2xs uppercase tracking-wider text-muted-foreground/50 font-semibold">
                    {section.title}
                  </span>
                  {canCollapse && (
                    <ChevronRight
                      className={cn(
                        'size-3 text-muted-foreground/40 transition-transform duration-200',
                        !isCollapsed && 'rotate-90',
                        'group-hover:text-muted-foreground/70'
                      )}
                    />
                  )}
                </button>
              ) : null}
              <AnimatePresence initial={false}>
                {(!isCollapsed || !canCollapse) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="space-y-0.5 overflow-hidden"
                  >
                    {section.items.map((item) => (
                      <NavItemLink key={item.href} item={item} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60 space-y-0.5">
        {settingsActive ? (
          <>
            <button
              onClick={() => { setSettingsOpen(false); if (settingsSidebar) router.push('/dashboard/clinic') }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4 shrink-0 text-muted-foreground/60" />
              Back to main
            </button>
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
            >
              <MessageSquare className="size-4 shrink-0 text-muted-foreground/60" />
              Public site
            </Link>
          </>
        ) : (
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
          >
            <Settings className="size-4 shrink-0 text-muted-foreground/60" />
            Settings
          </button>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex bg-muted/30 h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border/60 overflow-hidden">
        {SidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar with glass effect */}
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 flex items-center px-4 lg:px-6 gap-2" style={{ paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)' }}>
          {/* Settings back button */}
          {settingsActive && (
            <Button variant="ghost" size="sm" onClick={() => { setSettingsOpen(false); if (settingsSidebar) router.push('/dashboard/clinic') }} className="mr-1">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
          )}
          {/* Mobile menu trigger */}
          <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCollapsedSections({}) }}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden size-8">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {SidebarContent}
            </SheetContent>
          </Sheet>

          {/* Breadcrumbs */}
          <div className="flex-1 min-w-0">
            <Breadcrumbs />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg px-2.5 py-1.5 transition-colors mr-1"
              aria-label="Quick navigation"
            >
              <Search className="size-3" />
              <span>Search</span>
              <kbd className="ml-0.5 px-1 py-0.5 rounded bg-muted text-[9px] font-mono">⌘K</kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Search"
              onClick={() => setCmdOpen(true)}
            >
              <Search className="size-4" />
            </Button>
            <NotificationsDropdown userType={userType} />
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            )}
            {/* User menu dropdown */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 border-l border-border/60 py-1 pr-1 rounded-lg hover:bg-surface-3 transition-colors"
              >
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="size-3 text-muted-foreground hidden sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border/60 bg-card shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-border/60">
                    <div className="text-sm font-medium truncate">{userName}</div>
                    <div className="text-xs text-muted-foreground">{typeLabel}</div>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-surface-3 hover:text-foreground transition-colors"
                  >
                    <Settings className="size-3.5" />
                    Settings
                  </Link>
                  <button
                    onClick={() => { setUserMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content — animate in only, no exit delay, for snappy tab switches */}
        <div className="flex-1 overflow-y-auto">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="p-4 lg:p-6"
          >
            {children}
          </motion.main>
        </div>

        <footer className="shrink-0 border-t border-border/60 bg-background/80 backdrop-blur-xl px-4 lg:px-6 py-2.5 text-xs text-muted-foreground flex items-center justify-between" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.625rem)', paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)', paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)' }}>
          <span>© 2026 ClinicAI</span>
          <span className="hidden sm:inline">Multi-tenant · WhatsApp-first · ⌘K search · Alt+letter shortcuts</span>
        </footer>
      </div>

      <CommandPalette userType={userType} open={cmdOpen} onOpenChange={setCmdOpen} enabledFeatures={resolvedFeatures} />
    </div>
  )
}

// Common nav presets per role
export const platformAdminNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/platform', icon: LayoutDashboard },
  { label: 'Clinics', href: '/dashboard/platform/clinics', icon: Building2 },
  { label: 'LLM Keys', href: '/dashboard/platform/llm-keys', icon: KeyRound },
  { label: 'WhatsApp Keys', href: '/dashboard/platform/evolution-keys', icon: Radio },
  { label: 'Assembly AI', href: '/dashboard/platform/assembly-ai', icon: Mic },
  { label: 'Pricing Rules', href: '/dashboard/platform/pricing', icon: CreditCard },
  { label: 'Payment Accounts', href: '/dashboard/platform/accounts', icon: Wallet },
  { label: 'Platform Staff', href: '/dashboard/platform/staff', icon: UserCog },
  { label: 'Platform Calendar', href: '/dashboard/platform/calendar', icon: CalendarCheck },
  { label: 'Leads', href: '/dashboard/platform/leads', icon: Activity },
  { label: 'Blog', href: '/dashboard/platform/blogs', icon: FileText },
  { label: 'Analytics', href: '/dashboard/platform/analytics', icon: BarChart3 },
  { label: 'Audit Log', href: '/dashboard/platform/audit', icon: ShieldAlert },
]

export const clinicAdminNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/clinic', icon: LayoutDashboard },
  { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
  { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { label: 'AI Agent', href: '/dashboard/agent-chat', icon: Bot },
  { label: 'Website', href: '/dashboard/clinic/website', icon: Monitor },
  { label: 'Offers & Referrals', href: '/dashboard/clinic/offers', icon: Sparkles },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { label: 'Credits', href: '/dashboard/billing', icon: Wallet },
]

export const pharmacistNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/pharmacist', icon: LayoutDashboard },
  { label: 'Pharmacy Counter', href: '/dashboard/pharmacy/counter', icon: ShoppingCart },
  { label: 'Medicines', href: '/dashboard/pharmacy/medicines', icon: Pill },
  { label: 'Inventory', href: '/dashboard/pharmacy/inventory', icon: PackageSearch },
  { label: 'Prescriptions', href: '/dashboard/pharmacy/prescriptions', icon: FileText },
  { label: 'Suppliers', href: '/dashboard/pharmacy/suppliers', icon: Truck },
  { label: 'Pharmacy Reports', href: '/dashboard/pharmacy/reports', icon: BarChart3 },
]

export const labAdminNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/lab-admin', icon: LayoutDashboard },
  { label: 'Lab Orders', href: '/dashboard/clinic/lab/orders', icon: ClipboardList },
  { label: 'Lab Tests', href: '/dashboard/clinic/lab/tests', icon: FlaskConical },
  { label: 'Lab Reports', href: '/dashboard/clinic/lab/reports', icon: FileText },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
]

export const accountantNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/accountant', icon: LayoutDashboard },
  { label: 'Payments', href: '/dashboard/payments', icon: Wallet },
  { label: 'Billing & Wallet', href: '/dashboard/billing', icon: Receipt },
  { label: 'Bank Accounts', href: '/dashboard/clinic/bank-accounts', icon: Building2 },
  { label: 'Offline Payments', href: '/dashboard/payments/offline', icon: Banknote },
]

export const settingsNav: NavItem[] = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Doctors', href: '/dashboard/settings/doctors', icon: Stethoscope },
  { label: 'Staff', href: '/dashboard/settings/staff', icon: Users },
  { label: 'Services', href: '/dashboard/settings/services', icon: Activity },
  { label: 'WhatsApp', href: '/dashboard/settings/whatsapp', icon: Smartphone },
  { label: 'Bank Accounts', href: '/dashboard/settings/bank-accounts', icon: Wallet },
  { label: 'Booking Links', href: '/dashboard/settings/booking-links', icon: LinkIcon },
  { label: 'Quick Replies', href: '/dashboard/settings/quick-replies', icon: Zap },
  { label: 'Reminders', href: '/dashboard/settings/reminders', icon: Bell },
  { label: 'Analytics', href: '/dashboard/settings/analytics', icon: BarChart3 },
]

export const doctorNav: NavItem[] = [
  { label: "Today's Queue", href: '/dashboard/doctor', icon: LayoutDashboard },
  { label: 'Calendar', href: '/dashboard/doctor/calendar', icon: CalendarDays },
  { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
  { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
]

export const receptionistNav: NavItem[] = [
  { label: 'Live Queue', href: '/dashboard/receptionist', icon: LayoutDashboard },
  { label: 'Book Appointment', href: '/dashboard/receptionist/book', icon: CalendarDays },
  { label: 'Appointments', href: '/dashboard/appointments', icon: CalendarDays },
  { label: 'Patients', href: '/dashboard/patients', icon: Users },
  { label: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { label: 'Agent Chat Test', href: '/dashboard/agent-chat', icon: Bot },
  { label: 'Payments', href: '/dashboard/payments', icon: Wallet },
]

// Finance (platform staff - finance role, plus platform_admin): platform nav + finance sub-pages.
export const financeNav: NavItem[] = [
  ...platformAdminNav,
  { label: 'Payment Proofs', href: '/dashboard/finance/proofs', icon: Wallet },
  { label: 'Credit Ledger', href: '/dashboard/finance/ledger', icon: Receipt },
  { label: 'Invoices', href: '/dashboard/finance/invoices', icon: Receipt },
]
