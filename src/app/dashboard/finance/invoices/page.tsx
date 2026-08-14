import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { DashboardShell, financeNav } from '@/components/dashboard-shell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = { title: 'Invoices — ClinicAI Finance' }

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  sent: 'default',
  paid: 'default',
  overdue: 'destructive',
}

export default async function InvoicesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (session.type === 'clinic_admin') redirect('/dashboard/billing')
    redirect('/dashboard')
  }
  if (session.type === 'platform_staff' && session.role !== 'finance' && session.role !== 'support') {
    redirect('/dashboard/platform')
  }

  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { clinic: { select: { id: true, name: true } } },
  })

  const total = invoices.reduce((s, i) => s + i.platformFeeTotal, 0)
  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.platformFeeTotal, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.platformFeeTotal, 0)

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={financeNav}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Clinic billing periods — draft, sent, paid, overdue.</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Billed</div><div className="mt-1 text-2xl font-bold">PKR {total.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Paid</div><div className="mt-1 text-2xl font-bold text-chart-2">PKR {paid.toLocaleString()}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Overdue</div><div className="mt-1 text-2xl font-bold text-destructive">PKR {overdue.toLocaleString()}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Invoices</CardTitle>
            <CardDescription>{invoices.length} records · sorted by date</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No invoices yet.</div>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto scroll-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Appointments</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead className="text-right">Clinic Markup</TableHead>
                      <TableHead className="text-right">Meta Cost</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.clinic.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(i.periodStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} — {new Date(i.periodEnd).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">{i.totalAppointments}</TableCell>
                        <TableCell className="text-right">PKR {i.platformFeeTotal.toLocaleString()}</TableCell>
                        <TableCell className="text-right">PKR {i.clinicMarkupTotal.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${i.metaCostTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-center"><Badge variant={STATUS_VARIANT[i.status] || 'secondary'} className="text-xs capitalize">{i.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
