'use client'

import { DashboardShell, labAdminNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FlaskConical, ClipboardList, FileText, Users } from 'lucide-react'

interface Props {
  clinicName: string
  stats: { pendingOrders: number; totalTests: number; todayReports: number }
}

export function LabAdminDashboard({ clinicName, stats }: Props) {
  return (
    <DashboardShell
      userType="lab_admin"
      userName={clinicName}
      navItems={labAdminNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Lab Dashboard</h1>
          <p className="text-muted-foreground">Manage lab orders, tests, and reports.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lab Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
              <p className="text-xs text-muted-foreground mt-1">Available tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reports Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayReports}</div>
              <p className="text-xs text-muted-foreground mt-1">Generated reports</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/clinic/lab/orders"><ClipboardList className="size-4 mr-2" /> Lab Orders</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/clinic/lab/tests"><FlaskConical className="size-4 mr-2" /> Manage Lab Tests</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/clinic/lab/reports"><FileText className="size-4 mr-2" /> Lab Reports</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/patients"><Users className="size-4 mr-2" /> View Patients</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
