import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, settingsNav } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function SettingsBankAccountsPage() {
  const session = await getSession()
  if (!session || !session.clinicId) redirect('/login')

  const accounts = await db.clinicBankAccount.findMany({
    where: { clinicId: session.clinicId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <DashboardShell userType={session.type} userName={session.name} navItems={settingsNav} settingsSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Bank Accounts</h1>
        <p className="text-muted-foreground">Manage bank accounts and wallets for receiving patient payments.</p>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bank accounts added yet.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border">
                <div className="font-medium">{a.bankName}</div>
                <div className="text-sm text-muted-foreground">{a.accountTitle} — {a.accountNumber}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
