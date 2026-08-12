import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'
import { StaffManagementClient } from '@/app/dashboard/clinic/staff/staff-management-client'

export const dynamic = 'force-dynamic'

export default async function SettingsStaffPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const [doctors, receptionists, pharmacists, labAdmins, accountants] = await Promise.all([
    db.doctor.findMany({ where: { clinicId: session.clinicId }, select: { id: true, name: true, email: true, speciality: true, active: true, currentStatus: true } }),
    db.receptionist.findMany({ where: { clinicId: session.clinicId }, select: { id: true, name: true, email: true, active: true } }),
    db.pharmacist.findMany({ where: { clinicId: session.clinicId }, select: { id: true, name: true, email: true, active: true } }),
    db.labAdmin.findMany({ where: { clinicId: session.clinicId }, select: { id: true, name: true, email: true, active: true } }),
    db.accountant.findMany({ where: { clinicId: session.clinicId }, select: { id: true, name: true, email: true, active: true } }),
  ])

  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <StaffManagementClient
        clinicId={session.clinicId}
        doctors={JSON.parse(JSON.stringify(doctors))}
        receptionists={JSON.parse(JSON.stringify(receptionists))}
        pharmacists={JSON.parse(JSON.stringify(pharmacists))}
        labAdmins={JSON.parse(JSON.stringify(labAdmins))}
        accountants={JSON.parse(JSON.stringify(accountants))}
      />
    </DashboardShell>
  )
}
