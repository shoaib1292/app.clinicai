'use client'

import { DashboardShell, pharmacistNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pill, FileText, ShoppingCart, ArrowRight, PackageSearch, Truck, BarChart3 } from 'lucide-react'

interface Props {
  clinicName: string
  stats: { products: number; prescriptions: number; todaySales: number }
}

export function PharmacistDashboard({ clinicName, stats }: Props) {
  return (
    <DashboardShell
      userType="pharmacist"
      userName={clinicName}
      navItems={pharmacistNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Dashboard</h1>
          <p className="text-muted-foreground">Manage medicines, prescriptions, and sales.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
              <p className="text-xs text-muted-foreground mt-1">Active medicines in stock</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.prescriptions}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending prescriptions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySales}</div>
              <p className="text-xs text-muted-foreground mt-1">Transactions today</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/dashboard/pharmacy/counter"><ShoppingCart className="size-4 mr-2" /> New Sale (Counter)</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/dashboard/pharmacy/medicines"><Pill className="size-4 mr-2" /> Manage Medicines</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/dashboard/pharmacy/inventory"><PackageSearch className="size-4 mr-2" /> Check Inventory</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/dashboard/pharmacy/suppliers"><Truck className="size-4 mr-2" /> Suppliers & Purchases</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/dashboard/pharmacy/prescriptions"><FileText className="size-4 mr-2" /> View Prescriptions</a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/dashboard/pharmacy/reports"><BarChart3 className="size-4 mr-2" /> Pharmacy Reports</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
