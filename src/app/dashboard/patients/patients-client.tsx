'use client'

import { useState, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, ChevronDown, ChevronRight, Users, AlertCircle, Phone, Calendar, Activity, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Patient {
  id: string
  name: string | null
  phone: string
  phoneLast4: string
  gender: string
  preferredLanguage: string
  totalVisits: number
  noShowCount: number
  invalidBookingCount: number
  optInMarketing: boolean
  createdAt: Date
  updatedAt: Date
  _count: { appointments: number; familyMembers: number; conversations: number }
}

interface PatientDetail {
  id: string
  name: string | null
  phone: string
  gender: string
  preferredLanguage: string
  preferredModality: string
  totalVisits: number
  noShowCount: number
  invalidBookingCount: number
  optInMarketing: boolean
  createdAt: Date
  familyMembers: Array<{ id: string; name: string; gender: string; relation: string; notes: string | null }>
  appointments: Array<{
    id: string; start: Date; status: string; totalFee: number; paymentStatus: string;
    doctor: { id: string; name: string; speciality: string }; service: { name: string } | null
  }>
  _count: { conversations: number }
}

export function PatientsClient({ patients }: { patients: Patient[] }) {
  const [search, setSearch] = useState('')
  const [noShowOnly, setNoShowOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = patients.filter((p) => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.phoneLast4.includes(search)
    const matchNoShow = !noShowOnly || p.noShowCount > 0
    return matchSearch && matchNoShow
  })

  async function toggle(p: Patient) {
    const id = p.id
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    setDetail(null)
    setLoadingId(id)
    const res = await fetch(`/api/patients/${id}`)
    const json = await res.json()
    setLoadingId(null)
    if (json.ok) setDetail(json.data)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">{filtered.length} of {patients.length} patients · click a row for detail</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="noshow" checked={noShowOnly} onCheckedChange={setNoShowOnly} />
            <Label htmlFor="noshow" className="cursor-pointer font-normal text-sm flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />No-shows only
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[36rem] overflow-y-auto scroll-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Visits</TableHead>
                  <TableHead className="text-center">No-shows</TableHead>
                  <TableHead className="text-center">Appts</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No patients match.</TableCell></TableRow>
                )}
                {filtered.map((p) => {
                  const isOpen = expanded === p.id
                  return (
                    <Fragment key={p.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggle(p)}>
                        <TableCell className="text-muted-foreground">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{p.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground capitalize">{p.gender} · {p.preferredLanguage}</div>
                        </TableCell>
                        <TableCell className="text-sm"><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span></TableCell>
                        <TableCell className="text-center">{p.totalVisits}</TableCell>
                        <TableCell className="text-center">
                          {p.noShowCount > 0 ? <Badge variant="destructive" className="text-xs">{p.noShowCount}</Badge> : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-center text-sm">{p._count.appointments}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-PK')}</TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={p.id + '-detail'} className="bg-muted/30">
                          <TableCell colSpan={7} className="p-4">
                            {loadingId === p.id && <div className="text-center py-4 text-muted-foreground">Loading…</div>}
                            {detail && (
                              <>
                              <div className="flex justify-end mb-2">
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/dashboard/patients/${p.id}`}><ExternalLink className="w-3 h-3 mr-1" />View full profile</Link>
                                </Button>
                              </div>
                              <div className="grid gap-4 md:grid-cols-3">
                                {/* Profile */}
                                <div className="space-y-2">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />Profile</div>
                                  <div className="text-sm space-y-1">
                                    <div><strong>Name:</strong> {detail.name || 'Unknown'}</div>
                                    <div><strong>Phone:</strong> {detail.phone}</div>
                                    <div><strong>Gender:</strong> <span className="capitalize">{detail.gender}</span></div>
                                    <div><strong>Language:</strong> <span className="capitalize">{detail.preferredLanguage.replace('-', ' ')}</span></div>
                                    <div><strong>Modality:</strong> <span className="capitalize">{detail.preferredModality}</span></div>
                                    <div><strong>Invalid bookings:</strong> {detail.invalidBookingCount}</div>
                                    <div><strong>Conversations:</strong> {detail._count.conversations}</div>
                                  </div>
                                </div>

                                {/* Family members */}
                                <div className="space-y-2">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Family Members ({detail.familyMembers.length})</div>
                                  {detail.familyMembers.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">None recorded.</div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {detail.familyMembers.map((fm) => (
                                        <div key={fm.id} className="text-xs p-2 rounded border bg-background">
                                          <div className="font-medium">{fm.name} <Badge variant="outline" className="text-xs capitalize ml-1">{fm.relation}</Badge></div>
                                          <div className="text-muted-foreground capitalize">{fm.gender}{fm.notes ? ` · ${fm.notes}` : ''}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Appointment history */}
                                <div className="space-y-2">
                                  <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Recent Appointments</div>
                                  {detail.appointments.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">None.</div>
                                  ) : (
                                    <div className="space-y-1 max-h-48 overflow-y-auto scroll-thin">
                                      {detail.appointments.map((a) => (
                                        <div key={a.id} className="text-xs p-2 rounded border bg-background">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">{new Date(a.start).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            <Badge variant={a.status === 'completed' ? 'default' : a.status === 'no_show' || a.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                                              {a.status.replace('_', ' ')}
                                            </Badge>
                                          </div>
                                          <div className="text-muted-foreground">{a.doctor.name} · {a.service?.name || a.doctor.speciality}</div>
                                          <div className="text-muted-foreground">PKR {a.totalFee} · {a.paymentStatus}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
