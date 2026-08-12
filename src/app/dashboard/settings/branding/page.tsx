import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { ClinicBrandingTab } from '@/app/dashboard/settings/components/clinic-branding-tab'

export const dynamic = 'force-dynamic'

export default async function SettingsBrandingPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const clinic = await db.clinic.findUnique({
    where: { id: session.clinicId },
    select: {
      id: true, name: true, city: true, phone: true, whatsappNumber: true, address: true,
      timezone: true, currency: true,
      onlinePaymentsEnabled: true, agentEnabled: true,
      logoUrl: true, logoKey: true, workingHours: true,
      tagline: true, description: true, brandColor: true, headingFont: true, bodyFont: true,
      agentName: true, agentGender: true, agentTone: true, agentLanguages: true, agentWelcome: true, agentFallback: true,
      clinicStats: true,
    },
  })
  const doctors = await db.doctor.findMany({
    where: { clinicId: session.clinicId, active: true },
    select: { id: true, name: true, speciality: true, qualifications: true, imageKey: true, bio: true, languages: true, displayOnWebsite: true },
  })

  const brandingData = { ...clinic, doctors }

  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Branding & Info</h1>
        <p className="text-muted-foreground">Customize your clinic's brand colors, fonts, and website appearance.</p>
        <ClinicBrandingTab clinicId={clinic!.id} initialData={brandingData} doctors={doctors} />
      </div>
    </DashboardShell>
  )
}
