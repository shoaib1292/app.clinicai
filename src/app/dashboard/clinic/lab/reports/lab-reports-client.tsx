'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText } from 'lucide-react'

interface Report { id: string; patient: { name: string | null }; status: string; summary: string | null; generatedAt: string }

export function LabReportsClient({ clinicId }: { clinicId: string }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchReports() }, [])

  async function fetchReports() {
    setLoading(true)
    const res = await fetch(`/api/lab/reports?limit=100`)
    const json = await res.json()
    if (json.ok) setReports(json.data)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Lab Reports</h1>
        <p className="text-muted-foreground">View and manage lab reports</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id.slice(-8)}</TableCell>
                  <TableCell className="font-medium">{r.patient?.name || 'N/A'}</TableCell>
                  <TableCell><Badge variant={r.status === 'final' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{r.summary || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.generatedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {!loading && reports.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No reports yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
