import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShieldAlert } from 'lucide-react'

export const metadata = { title: 'Audit Log — ClinicAI' }

export default async function AuditPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  const logs = await db.auditLog.findMany({ take: 200, orderBy: { ts: 'desc' }, include: { clinic: { select: { name: true } } } })

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-brand" /> Audit Log</h1>
          <p className="text-muted-foreground">Immutable record of all privileged actions. Retained 12 months.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent {logs.length} Events</CardTitle>
            <CardDescription>Most recent first</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-3 p-2 rounded-md border text-sm">
                    <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{l.action}</span>
                        <Badge variant="outline" className="text-xs capitalize">{l.actorType.replace('_', ' ')}</Badge>
                        {l.clinic && <Badge variant="secondary" className="text-xs">{l.clinic.name}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.actorType} {l.actorId?.slice(-8)} · {l.target || '—'} · {new Date(l.ts).toLocaleString('en-PK')} · {l.ip || ''}
                      </div>
                      {l.metadata && l.metadata !== '{}' && (
                        <div className="text-xs text-muted-foreground font-mono mt-1">{l.metadata}</div>
                      )}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-center text-muted-foreground py-8">No audit events yet.</div>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
