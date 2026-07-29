import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserCog } from 'lucide-react'

export const metadata = { title: 'Platform Staff — ClinicAI' }

export default async function StaffPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  const [admins, staff] = await Promise.all([
    db.platformAdmin.findMany(),
    db.platformStaff.findMany({ orderBy: { role: 'asc' } }),
  ])

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Platform Staff</h1>
          <p className="text-muted-foreground">Scoped access control — sales, onboarding, support, finance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Admins (2FA mandatory)</CardTitle>
            <CardDescription>Super-admins with full access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-brand font-semibold">{a.name.charAt(0)}</div>
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="capitalize">{a.role.replace('_', ' ')}</Badge>
                  {a.twoFactorEnabled && <Badge variant="secondary" className="text-xs">2FA</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Staff</CardTitle>
            <CardDescription>Scoped staff — each role has limited access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-md border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><UserCog className="w-4 h-4" /></div>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                    <div className="text-xs text-muted-foreground">{(JSON.parse(s.scopes || '[]') as string[]).length} scopes</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{s.role}</Badge>
                  <Badge variant={s.active ? 'default' : 'destructive'} className="text-xs">{s.active ? 'Active' : 'Disabled'}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role Scope Matrix</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-md bg-muted/40"><strong>Sales:</strong> View onboarding clinics, convert leads, book platform appointments, no patient data access</div>
              <div className="p-2 rounded-md bg-muted/40"><strong>Onboarding:</strong> Provision clinic, assist QR/Meta setup, seed doctors/schedules, hand off</div>
              <div className="p-2 rounded-md bg-muted/40"><strong>Support:</strong> Read-only access to clinic configs & conversations for debugging; writes require audit</div>
              <div className="p-2 rounded-md bg-muted/40"><strong>Finance:</strong> View invoices, credit ledgers, confirm/reject payment proofs, trigger settlement, reconcile Meta costs</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
