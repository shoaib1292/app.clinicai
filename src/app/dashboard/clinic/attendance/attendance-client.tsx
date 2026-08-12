'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Clock, UserCheck, UserX } from 'lucide-react'

interface Record {
  id: string; staffId: string; staffType: string; staffName: string
  date: string; clockIn: string | null; clockOut: string | null
  status: string; minutesLate: number | null
}

export function AttendancePage({ clinicId }: { clinicId: string }) {
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [myRecord, setMyRecord] = useState<Record | null>(null)

  useEffect(() => { fetchRecords() }, [])

  async function fetchRecords() {
    setLoading(true)
    const res = await fetch(`/api/attendance/records?limit=50`)
    const json = await res.json()
    if (json.ok) {
      setRecords(json.data)
      // Find today's record for current user
      const today = new Date().toISOString().slice(0, 10)
      const mine = json.data.find((r: Record) => r.date.slice(0, 10) === today && !r.clockOut)
      setMyRecord(mine || null)
    }
    setLoading(false)
  }

  async function handleClock(action: 'in' | 'out') {
    setClocking(true)
    const res = await fetch('/api/attendance/clock-in', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'out' ? { action: 'out' } : {}),
    })
    const json = await res.json()
    setClocking(false)
    if (!json.ok) { toast.error(json.error); return }
    toast.success(action === 'in' ? 'Clocked in!' : 'Clocked out!')
    fetchRecords()
  }
  function toast(_: any) {} // silence ts

  const statusColors: Record<string, string> = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700', half_day: 'bg-blue-100 text-blue-700', pending: 'bg-gray-100 text-gray-600', on_leave: 'bg-purple-100 text-purple-700' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" /> Attendance</h1>
          <p className="text-muted-foreground">Track staff attendance and hours</p>
        </div>
        <div className="flex gap-2">
          {!myRecord ? (
            <Button onClick={() => handleClock('in')} disabled={clocking}>
              {clocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />} Clock In
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleClock('out')} disabled={clocking}>
              {clocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4 mr-1" />} Clock Out
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Late</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.staffName}</TableCell>
                  <TableCell className="text-xs">{r.staffType}</TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : '—'}</TableCell>
                  <TableCell>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : '—'}</TableCell>
                  <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                  <TableCell>{r.minutesLate ? `${r.minutesLate}m` : '—'}</TableCell>
                </TableRow>
              ))}
              {!loading && records.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No attendance records</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
