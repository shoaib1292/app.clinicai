'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Clock, MessageSquare, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Reminder {
  id: string
  type: string
  sendAt: Date
  status: string
  channel: string
  error: string | null
  sentAt: Date | null
  appointment: {
    id: string
    start: Date
    patient: { name: string | null; phone: string }
    doctor: { name: string; speciality: string }
  }
}
interface Template {
  id: string
  channel: string
  triggerEvent: string
  bodyTemplate: string
  language: string
  modality: string
  enabled: boolean
}

const typeLabels: Record<string, string> = {
  reminder_24h: '24h Reminder',
  reminder_2h: '2h Reminder',
  reminder_30min: '30min Reminder',
}

const statusIcon = (status: string) => {
  if (status === 'sent') return <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" />
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-destructive" />
  return <Clock className="w-3.5 h-3.5 text-chart-4" />
}

export function RemindersClient({ reminders, templates }: { reminders: Reminder[]; templates: Template[] }) {
  const now = new Date()
  const upcoming = reminders.filter((r) => r.status === 'pending')
  const overdue = upcoming.filter((r) => new Date(r.sendAt) < now)
  const future = upcoming.filter((r) => new Date(r.sendAt) >= now)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-brand" />Reminders & Notifications</h1>
        <p className="text-muted-foreground">Scheduled appointment reminders + notification templates</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <Clock className="w-5 h-5 text-chart-4" />
            <div className="mt-2 text-2xl font-bold">{future.length}</div>
            <div className="text-xs text-muted-foreground">Scheduled (future)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Bell className="w-5 h-5 text-destructive" />
            <div className="mt-2 text-2xl font-bold">{overdue.length}</div>
            <div className="text-xs text-muted-foreground">Overdue (pending)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle2 className="w-5 h-5 text-chart-2" />
            <div className="mt-2 text-2xl font-bold">{reminders.filter((r) => r.status === 'sent').length}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <MessageSquare className="w-5 h-5 text-brand" />
            <div className="mt-2 text-2xl font-bold">{templates.length}</div>
            <div className="text-xs text-muted-foreground">Templates</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming reminders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Reminders</CardTitle>
            <CardDescription>Next 50 scheduled reminders (T-24h, T-2h, T-30min before appointments)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto scroll-thin space-y-2">
              {reminders.length === 0 && <div className="text-center text-muted-foreground py-8">No upcoming reminders.</div>}
              {reminders.map((r) => {
                const isOverdue = new Date(r.sendAt) < now && r.status === 'pending'
                return (
                  <div key={r.id} className={`p-3 rounded-md border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-accent/40'} transition-colors`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          {r.appointment.patient.name || r.appointment.patient.phone}
                          <Badge variant="outline" className="text-xs">{typeLabels[r.type] || r.type}</Badge>
                          {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Send: {new Date(r.sendAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>·</span>
                          <span>{r.appointment.doctor.name}</span>
                          <span>·</span>
                          <span>Appt: {new Date(r.appointment.start).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusIcon(r.status)}
                        <Badge variant={r.status === 'sent' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs capitalize">{r.status}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{r.channel}</Badge>
                      </div>
                    </div>
                    {r.error && <div className="text-xs text-destructive mt-1">Error: {r.error}</div>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" />Notification Templates</CardTitle>
            <CardDescription>{templates.length} templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto scroll-thin space-y-2">
              {templates.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm">No templates configured.</div>}
              {templates.map((t) => (
                <div key={t.id} className={`p-3 rounded-md border ${t.enabled ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{t.triggerEvent}</Badge>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">{t.language}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{t.modality}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-3 urdu" dir="rtl">{t.bodyTemplate}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
