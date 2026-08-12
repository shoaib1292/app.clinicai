'use client'

import { DashboardShell, accountantNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, Receipt, Building2, Banknote } from 'lucide-react'
import { AnimatedCounter } from '@/components/animated-counter'

interface Props {
  clinicName: string
  stats: { pendingPayments: number; creditBalance: number }
}

export function AccountantDashboard({ clinicName, stats }: Props) {
  return (
    <DashboardShell
      userType="accountant"
      userName={clinicName}
      navItems={accountantNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">Manage payments, billing, and accounts.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <p className="text-xs text-muted-foreground mt-1">Payment proofs awaiting verification</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter from={0} to={stats.creditBalance} duration={800} />
                <span className="text-sm ml-1 font-normal text-muted-foreground">PKR</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Available clinic credits</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/payments"><Wallet className="size-4 mr-2" /> Payment Proofs</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/payments/offline"><Banknote className="size-4 mr-2" /> Record Offline Payment</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/billing"><Receipt className="size-4 mr-2" /> Billing & Credit Ledger</a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="/dashboard/clinic/bank-accounts"><Building2 className="size-4 mr-2" /> Bank Accounts</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
