'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, Stethoscope, UserCog, Pill, FlaskConical, Wallet } from 'lucide-react'

interface Doctor { id: string; name: string; email: string | null; speciality: string; active: boolean; currentStatus: string }
interface Staff { id: string; name: string; email: string | null; active: boolean }

interface Props {
  clinicId: string
  doctors: Doctor[]
  receptionists: Staff[]
  pharmacists: Staff[]
  labAdmins: Staff[]
  accountants: Staff[]
}

function StaffTable({ staff, columns }: { staff: Staff[]; columns: string[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => <TableHead key={c}>{c}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.map((s) => (
          <TableRow key={s.id} className={s.active ? '' : 'opacity-50'}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell className="text-xs">{s.email || '—'}</TableCell>
            <TableCell><Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Active' : 'Inactive'}</Badge></TableCell>
          </TableRow>
        ))}
        {staff.length === 0 && (
          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No staff added yet</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export function StaffManagementClient({ clinicId, doctors, receptionists, pharmacists, labAdmins, accountants }: Props) {
  const total = doctors.length + receptionists.length + pharmacists.length + labAdmins.length + accountants.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Staff Management</h1>
        <p className="text-muted-foreground">View and manage all clinic staff — {total} total</p>
      </div>

      <Tabs defaultValue="doctors">
        <TabsList>
          <TabsTrigger value="doctors"><Stethoscope className="size-3.5 mr-1" /> Doctors ({doctors.length})</TabsTrigger>
          <TabsTrigger value="receptionists"><UserCog className="size-3.5 mr-1" /> Receptionists ({receptionists.length})</TabsTrigger>
          <TabsTrigger value="pharmacists"><Pill className="size-3.5 mr-1" /> Pharmacists ({pharmacists.length})</TabsTrigger>
          <TabsTrigger value="lab-admins"><FlaskConical className="size-3.5 mr-1" /> Lab Admins ({labAdmins.length})</TabsTrigger>
          <TabsTrigger value="accountants"><Wallet className="size-3.5 mr-1" /> Accountants ({accountants.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="doctors">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5" /> Doctors ({doctors.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Speciality</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map(d => (
                    <TableRow key={d.id} className={d.active ? '' : 'opacity-50'}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-xs">{d.email || '—'}</TableCell>
                      <TableCell>{d.speciality}</TableCell>
                      <TableCell><Badge variant={d.active ? 'default' : 'secondary'}>{d.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{d.currentStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receptionists">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Receptionists ({receptionists.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <StaffTable staff={receptionists} columns={['Name', 'Email', 'Status']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pharmacists">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" /> Pharmacists ({pharmacists.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <StaffTable staff={pharmacists} columns={['Name', 'Email', 'Status']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab-admins">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" /> Lab Admins ({labAdmins.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <StaffTable staff={labAdmins} columns={['Name', 'Email', 'Status']} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accountants">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Accountants ({accountants.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <StaffTable staff={accountants} columns={['Name', 'Email', 'Status']} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
