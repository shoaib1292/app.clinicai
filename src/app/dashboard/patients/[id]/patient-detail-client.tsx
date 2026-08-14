'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Phone, CalendarDays, MessageSquare, Users, AlertTriangle, Clock, CheckCircle2, XCircle, Stethoscope, Sparkles, Ban, Bot } from 'lucide-react'

interface FamilyMember { id: string; name: string; gender: string; relation: string; notes: string | null }
interface Appointment {
  id: string; start: Date; end: Date; status: string; channel: string; totalFee: number
  paymentStatus: string; paymentMode: string; checkInTime: Date | null
  doctor: { id: string; name: string; speciality: string }
  service: { name: string } | null
  fees: { baseDoctorFee: number; clinicMarkup: number; platformFee: number; total: number } | null
}
interface Conversation { id: string; status: string; lastIntent: string | null; updatedAt: Date; _count: { messages: number } }
interface Patient {
  id: string; name: string | null; phone: string; phoneLast4: string; gender: string
  preferredLanguage: string; preferredModality: string; noShowCount: number; totalVisits: number
  invalidBookingCount: number; optInMarketing: boolean; createdAt: Date; updatedAt: Date
  familyMembers: FamilyMember[]
  appointments: Appointment[]
  conversations: Conversation[]
}

const statusBadge = (status: string) => {
  const map: Record<string, 'default' | 'secondary' | 'destructive'> = {
    completed: 'default', booked: 'secondary', cancelled: 'destructive',
    no_show: 'destructive', late_no_show: 'destructive', invalid: 'destructive',
  }
  return <Badge variant={map[status] || 'secondary'} className="text-xs capitalize">{status.replace('_', ' ')}</Badge>
}

const genderHonorific = (gender: string, name: string | null) => {
  if (!name) return 'Patient'
  if (gender === 'female') return `${name} Begum`
  if (gender === 'male') return `${name} Sahab`
  return name
}

// Build a unified timeline of patient events (appointments + conversations)
type TimelineEvent = {
  id: string
  date: Date
  type: 'booked' | 'completed' | 'no_show' | 'cancelled' | 'conversation' | 'registered'
  title: string
  description: string
  doctor?: string
  href?: string
}

function buildTimeline(patient: Patient): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Registration event
  events.push({
    id: 'registered',
    date: patient.createdAt,
    type: 'registered',
    title: 'Patient registered',
    description: `${patient.preferredLanguage} · ${patient.preferredModality} modality`,
  })

  // Appointment events
  for (const a of patient.appointments) {
    let type: TimelineEvent['type'] = 'booked'
    if (a.status === 'completed') type = 'completed'
    else if (a.status === 'no_show' || a.status === 'late_no_show') type = 'no_show'
    else if (a.status === 'cancelled') type = 'cancelled'

    events.push({
      id: a.id,
      date: a.start,
      type,
      title: `${a.doctor.name} · ${a.service?.name || a.doctor.speciality}`,
      description: `PKR ${a.totalFee} · ${a.channel} channel`,
      doctor: a.doctor.name,
      href: '/dashboard/appointments',
    })
  }

  // Conversation events
  for (const c of patient.conversations) {
    events.push({
      id: c.id,
      date: c.updatedAt,
      type: 'conversation',
      title: `${c._count.messages} message${c._count.messages !== 1 ? 's' : ''} with AI agent`,
      description: c.lastIntent ? `Intent: ${c.lastIntent}` : 'WhatsApp conversation',
      href: `/dashboard/conversations/${c.id}`,
    })
  }

  // Sort newest first, take 12
  return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 12)
}

const TIMELINE_ICON: Record<TimelineEvent['type'], React.ComponentType<{ className?: string }>> = {
  registered: Sparkles,
  booked: CalendarDays,
  completed: CheckCircle2,
  no_show: XCircle,
  cancelled: Ban,
  conversation: Bot,
}

const TIMELINE_COLOR: Record<TimelineEvent['type'], string> = {
  registered: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  booked: 'bg-brand/15 text-brand',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  no_show: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  cancelled: 'bg-muted text-muted-foreground',
  conversation: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

const TIMELINE_LINE: Record<TimelineEvent['type'], string> = {
  registered: 'bg-violet-400',
  booked: 'bg-brand',
  completed: 'bg-emerald-400',
  no_show: 'bg-rose-400',
  cancelled: 'bg-muted-foreground',
  conversation: 'bg-amber-400',
}

export function PatientDetailClient({ patient }: { patient: Patient }) {
  const completedAppts = patient.appointments.filter((a) => a.status === 'completed').length
  const noShowRate = patient.appointments.length > 0
    ? ((patient.noShowCount / (patient.totalVisits + patient.noShowCount)) * 100).toFixed(1)
    : '0'
  const timeline = buildTimeline(patient)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/patients"><ArrowLeft className="w-4 h-4 mr-1" />All patients</Link></Button>
      </div>

      {/* Patient header */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-brand-soft text-brand text-xl">
                {patient.name?.charAt(0).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{genderHonorific(patient.gender, patient.name)}</h1>
                <Badge variant="outline" className="capitalize">{patient.gender}</Badge>
                {patient.noShowCount >= 3 && (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Habitual no-show</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phone}</span>
                <span>·</span>
                <span className="capitalize">{patient.preferredLanguage}</span>
                <span>·</span>
                <span className="capitalize">{patient.preferredModality} modality</span>
                <span>·</span>
                <span>Patient since {new Date(patient.createdAt).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/agent-chat?phone=${patient.phone}`}><MessageSquare className="w-4 h-4 mr-1" />Chat</Link>
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className="text-2xl font-bold text-foreground">{patient.totalVisits}</div>
              <div className="text-xs text-muted-foreground">Total Visits</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className="text-2xl font-bold text-chart-2">{completedAppts}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className={`text-2xl font-bold ${patient.noShowCount >= 3 ? 'text-destructive' : 'text-chart-4'}`}>{patient.noShowCount}</div>
              <div className="text-xs text-muted-foreground">No-shows</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className="text-2xl font-bold text-foreground">{noShowRate}%</div>
              <div className="text-xs text-muted-foreground">No-show rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Appointment history */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" />Appointment History</CardTitle>
            <CardDescription>{patient.appointments.length} appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto scroll-thin space-y-2">
              {patient.appointments.length === 0 && <div className="text-center text-muted-foreground py-8">No appointments yet.</div>}
              {patient.appointments.map((a) => (
                <div key={a.id} className="p-3 rounded-md border hover:bg-accent/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {a.doctor.name}
                        {statusBadge(a.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(a.start).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span className="capitalize">{a.channel}</span>
                        {a.service && <><span>·</span><span>{a.service.name}</span></>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">PKR {a.totalFee}</div>
                      <div className="text-xs text-muted-foreground capitalize">{a.paymentStatus} · {a.paymentMode}</div>
                    </div>
                  </div>
                  {a.fees && (
                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t flex gap-3">
                      <span>Doctor: {a.fees.baseDoctorFee}</span>
                      <span>Markup: {a.fees.clinicMarkup}</span>
                      <span>Platform: {a.fees.platformFee}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Family + Conversations */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Family Members</CardTitle>
              <CardDescription>{patient.familyMembers.length} members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {patient.familyMembers.length === 0 && <div className="text-center text-muted-foreground py-4 text-sm">No family members recorded.</div>}
              {patient.familyMembers.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-md border">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted text-xs">{f.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{f.relation} · {f.gender}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" />Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {patient.conversations.length === 0 && <div className="text-center text-muted-foreground py-4 text-sm">No conversations.</div>}
              {patient.conversations.map((c) => (
                <Link key={c.id} href={`/dashboard/conversations/${c.id}`} className="block p-2 rounded-md border hover:bg-accent/40">
                  <div className="flex items-center justify-between">
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-xs">{c.status}</Badge>
                    <span className="text-xs text-muted-foreground">{c._count.messages} msgs</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(c.updatedAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Patient Journey Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" />
            Patient Journey Timeline
          </CardTitle>
          <CardDescription>Chronological view of {patient.name || 'patient'}&apos;s interactions with the clinic</CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="empty-state">
              <div className="icon-wrap"><Clock className="w-6 h-6" /></div>
              <div className="font-medium">No activity yet</div>
              <div className="text-xs">Once this patient books or messages, events will appear here.</div>
            </div>
          ) : (
            <ol className="relative max-h-[480px] overflow-y-auto scroll-thin pl-2">
              {timeline.map((e, idx) => {
                const Icon = TIMELINE_ICON[e.type]
                const color = TIMELINE_COLOR[e.type]
                const lineColor = TIMELINE_LINE[e.type]
                const isLast = idx === timeline.length - 1
                const Wrapper = (e.href ? Link : 'div') as React.ElementType
                return (
                  <li key={e.id} className="relative pl-10 pb-6 group">
                    {/* Vertical connector line */}
                    {!isLast && (
                      <span
                        className={`absolute left-[14px] top-7 bottom-0 w-0.5 ${lineColor} opacity-30`}
                        aria-hidden
                      />
                    )}
                    {/* Icon dot */}
                    <span
                      className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-background ${color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    {/* Content */}
                    <Wrapper
                      {...(e.href ? { href: e.href } : {})}
                      className={`block rounded-md p-3 -ml-1 ${e.href ? 'hover:bg-accent/40 hover:border-brand/30 border border-transparent transition-colors' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{e.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{e.description}</div>
                        </div>
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(e.date).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </Wrapper>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
