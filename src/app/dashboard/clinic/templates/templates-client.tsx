'use client'

import { useState, useEffect } from 'react'
import { DashboardShell, clinicAdminNav } from '@/components/dashboard-shell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MessageSquare, Save, RotateCcw, Variable, Sparkles, Loader2, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import type { SessionPayload } from '@/lib/auth'

interface Template {
  id: string
  channel: string
  triggerEvent: string
  bodyTemplate: string
  language: string
  modality: string
  enabled: boolean
  updatedAt: string
}

interface Props {
  session: SessionPayload
  clinicName: string
}

const TRIGGER_META: Record<string, { label: string; description: string; when: string }> = {
  booking_confirm: { label: 'Booking Confirmation', description: 'Sent immediately when appointment is booked', when: 'On booking' },
  reminder_24h: { label: 'Reminder · 24 Hours', description: 'Sent 24 hours before appointment', when: 'T-24h' },
  reminder_2h: { label: 'Reminder · 2 Hours', description: 'Sent 2 hours before appointment', when: 'T-2h' },
  reminder_30min: { label: 'Reminder · 30 Minutes', description: 'Sent 30 minutes before appointment', when: 'T-30min' },
  cancel: { label: 'Cancellation Notice', description: 'Sent when appointment is cancelled', when: 'On cancel' },
  reschedule: { label: 'Reschedule Notice', description: 'Sent when appointment is rescheduled', when: 'On reschedule' },
  no_show_followup: { label: 'No-show Follow-up', description: 'Sent after patient misses appointment', when: 'Post no-show' },
  payment_confirm: { label: 'Payment Confirmation', description: 'Sent when payment is confirmed', when: 'On payment' },
}

const VARIABLES = [
  { token: '{patient_name}', desc: 'Patient name (Urdu honorifics)' },
  { token: '{doctor_name}', desc: 'Doctor name' },
  { token: '{date}', desc: 'Appointment date (e.g. 15 June)' },
  { token: '{time}', desc: 'Appointment time (e.g. 4:30 PM)' },
  { token: '{token}', desc: 'Queue token number' },
  { token: '{fee}', desc: 'Total fee (PKR)' },
  { token: '{clinic_name}', desc: 'Clinic name' },
  { token: '{amount}', desc: 'Payment amount (PKR)' },
]

export function TemplatesClient({ session, clinicName }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setTemplates(j.data.templates)
          const d: Record<string, string> = {}
          const e: Record<string, boolean> = {}
          for (const t of j.data.templates) {
            d[t.id] = t.bodyTemplate
            e[t.id] = t.enabled
          }
          setDrafts(d)
          setEnabledMap(e)
        } else {
          toast.error(j.error || 'Failed to load templates')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save(id: string) {
    setSavingId(id)
    try {
      const res = await fetch('/api/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          bodyTemplate: drafts[id],
          enabled: enabledMap[id],
        }),
      })
      const j = await res.json()
      if (j.ok) {
        setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, bodyTemplate: drafts[id], enabled: enabledMap[id], updatedAt: j.data.template.updatedAt } : t)))
        toast.success('Template saved', { description: 'Will be used for all new messages' })
      } else {
        toast.error(j.error || 'Failed to save')
      }
    } finally {
      setSavingId(null)
    }
  }

  function reset(id: string, original: string) {
    setDrafts((prev) => ({ ...prev, [id]: original }))
    toast.info('Reverted to saved version')
  }

  function insertVar(id: string, token: string) {
    setDrafts((prev) => ({ ...prev, [id]: (prev[id] || '') + ' ' + token }))
  }

  return (
    <DashboardShell userType="clinic_admin" userName={session.name} clinicName={clinicName} navItems={clinicAdminNav}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-brand" />
              Message Templates
            </h1>
            <p className="text-muted-foreground">Customize WhatsApp messages patients receive at each touchpoint</p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <Sparkles className="w-3 h-3 text-brand" />
            {templates.length} templates · {templates.filter((t) => t.enabled).length} active
          </Badge>
        </div>

        {/* Variables helper */}
        <Card className="border-brand/20 bg-brand/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-brand/15 flex items-center justify-center shrink-0">
                <Variable className="w-4 h-4 text-brand" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium mb-2">Template variables — auto-replaced at send time</div>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <span
                      key={v.token}
                      className="text-xs font-mono px-2 py-0.5 rounded-md bg-card border border-brand/20 hover:border-brand/40 transition-colors cursor-help"
                      title={v.desc}
                    >
                      {v.token}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Click any template's variable chip to insert at cursor. Variables are replaced when the message is sent.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template cards */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="skeleton h-5 w-1/3" />
                  <div className="skeleton h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((t) => {
              const meta = TRIGGER_META[t.triggerEvent] || { label: t.triggerEvent, description: '', when: '' }
              const draft = drafts[t.id] ?? t.bodyTemplate
              const isDirty = draft !== t.bodyTemplate
              const isSaving = savingId === t.id
              return (
                <Card key={t.id} className={isDirty ? 'border-brand/40' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {meta.label}
                          <Badge variant="outline" className="text-[10px] font-mono">{meta.when}</Badge>
                        </CardTitle>
                        {meta.description && <CardDescription className="mt-1">{meta.description}</CardDescription>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={enabledMap[t.id] ?? t.enabled}
                          onCheckedChange={(v) => setEnabledMap((prev) => ({ ...prev, [t.id]: v }))}
                        />
                        <span className="text-xs text-muted-foreground">{enabledMap[t.id] ?? t.enabled ? 'Enabled' : 'Paused'}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      rows={3}
                      className="font-mono text-sm resize-none focus-brand"
                      placeholder="Template body..."
                    />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex flex-wrap gap-1">
                        {VARIABLES.slice(0, 5).map((v) => (
                          <button
                            key={v.token}
                            onClick={() => insertVar(t.id, v.token)}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-brand/15 hover:text-brand transition-colors"
                            title={`Insert ${v.token}`}
                          >
                            {v.token}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {draft.length}/1024
                          {isDirty && <span className="ml-2 text-brand">● unsaved</span>}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reset(t.id, t.bodyTemplate)}
                          disabled={!isDirty || isSaving}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />Revert
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => save(t.id)}
                          disabled={!isDirty || isSaving}
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="rounded-md bg-muted/30 p-3 border-l-2 border-brand/40">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Preview (with sample data)</div>
                      <div className="text-sm chat-bubble-out inline-block max-w-full px-3 py-2">
                        {draft
                          .replace('{patient_name}', 'Ahmed Khan')
                          .replace('{doctor_name}', 'Dr. Ahmed')
                          .replace('{date}', '15 June')
                          .replace('{time}', '4:30 PM')
                          .replace('{token}', '5')
                          .replace('{fee}', '1,250')
                          .replace('{clinic_name}', clinicName)
                          .replace('{amount}', '1,250')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {templates.length === 0 && !loading && (
              <Card>
                <CardContent className="empty-state">
                  <div className="icon-wrap"><MessageSquare className="w-6 h-6" /></div>
                  <div className="font-medium">No templates yet</div>
                  <div className="text-xs">Templates will appear here once your clinic is provisioned.</div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="border-dashed">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> Keep messages short and use Urdu/Roman-Urdu to match patient preference.
              Avoid special characters that WhatsApp may strip. Token and time are the most-clicked bits — keep them near the start.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
