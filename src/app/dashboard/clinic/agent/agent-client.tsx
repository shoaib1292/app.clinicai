'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Bot, Loader2, Sparkles, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'

interface Initial {
  name: string
  agentEnabled: boolean
  agentName: string
  agentGender: string
  agentTone: string
  agentLanguages: string
  agentWelcome: string
  agentFallback: string
  onlinePaymentsEnabled: boolean
}

const LANGS = [
  { key: 'urdu', label: 'Urdu' },
  { key: 'english', label: 'English' },
  { key: 'roman-urdu', label: 'Roman Urdu' },
] as const

export function AgentClient({ clinicId, initial }: { clinicId: string; initial: Initial }) {
  const [form, setForm] = useState({
    agentName: initial.agentName,
    agentGender: initial.agentGender,
    agentTone: initial.agentTone,
    agentLanguages: initial.agentLanguages.split(',').filter(Boolean),
    agentWelcome: initial.agentWelcome,
    agentFallback: initial.agentFallback,
    onlinePaymentsEnabled: initial.onlinePaymentsEnabled,
  })
  const [saving, setSaving] = useState(false)

  function toggleLang(key: string) {
    setForm((f) => ({
      ...f,
      agentLanguages: f.agentLanguages.includes(key)
        ? f.agentLanguages.filter((l) => l !== key)
        : [...f.agentLanguages, key],
    }))
  }

  async function save() {
    if (!form.agentName.trim()) { toast.error('Agent name required'); return }
    if (form.agentLanguages.length === 0) { toast.error('Pick at least one language'); return }
    setSaving(true)
    const res = await fetch(`/api/clinics/${clinicId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: form.agentName,
        agentGender: form.agentGender,
        agentTone: form.agentTone,
        agentLanguages: form.agentLanguages.join(','),
        agentWelcome: form.agentWelcome,
        agentFallback: form.agentFallback,
        onlinePaymentsEnabled: form.onlinePaymentsEnabled,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!json.ok) { toast.error(json.error || 'Save failed'); return }
    toast.success('Agent persona updated')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Persona</h1>
        <p className="text-muted-foreground">Customise how the AI agent greets and talks to your patients on WhatsApp.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4 text-brand" />Persona Settings</CardTitle>
            <CardDescription>Changes apply to new conversations immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input value={form.agentName} onChange={(e) => setForm({ ...form, agentName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.agentGender} onValueChange={(v) => setForm({ ...form, agentGender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={form.agentTone} onValueChange={(v) => setForm({ ...form, agentTone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex gap-4">
                {LANGS.map((l) => (
                  <div key={l.key} className="flex items-center gap-2">
                    <Checkbox id={`lang-${l.key}`} checked={form.agentLanguages.includes(l.key)} onCheckedChange={() => toggleLang(l.key)} />
                    <Label htmlFor={`lang-${l.key}`} className="cursor-pointer font-normal">{l.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea rows={2} value={form.agentWelcome} onChange={(e) => setForm({ ...form, agentWelcome: e.target.value })} />
              <p className="text-xs text-muted-foreground">Sent automatically when a patient first messages the clinic.</p>
            </div>

            <div className="space-y-2">
              <Label>Fallback Message</Label>
              <Textarea rows={2} value={form.agentFallback} onChange={(e) => setForm({ ...form, agentFallback: e.target.value })} />
              <p className="text-xs text-muted-foreground">Used when the agent can't understand or doesn't know how to respond.</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md border">
              <div>
                <div className="font-medium">Online Payments</div>
                <div className="text-xs text-muted-foreground">Allow patients to send transfer screenshots for confirmation.</div>
              </div>
              <Switch checked={form.onlinePaymentsEnabled} onCheckedChange={(v) => setForm({ ...form, onlinePaymentsEnabled: v })} />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Save Persona
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live preview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
            <CardDescription>How {form.agentName || 'Agent'} will greet patients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <div className="brand-gradient p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-brand-foreground" />
                </div>
                <div>
                  <div className="font-medium text-brand-foreground text-sm">{form.agentName || 'Agent'}</div>
                  <div className="text-xs text-brand-foreground/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-chart-2 inline-block" /> online · {form.agentTone}
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-3 bg-muted/20 min-h-[200px]">
                <div className="flex justify-end">
                  <div className="chat-bubble-out px-3 py-2 max-w-[85%]">
                    <div className="text-sm whitespace-pre-wrap">{form.agentWelcome || '(welcome message)'}</div>
                    <div className="text-[10px] mt-1 flex items-center justify-end gap-1 text-brand-foreground/70">
                      now <CheckCheck className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="chat-bubble-in px-3 py-2 max-w-[85%]">
                    <div className="text-sm">Mujhe appointment lena hai</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="chat-bubble-out px-3 py-2 max-w-[85%]">
                    <div className="text-sm whitespace-pre-wrap">{form.agentFallback || '(fallback message)'}</div>
                    <div className="text-[10px] mt-1 flex items-center justify-end gap-1 text-brand-foreground/70">
                      now <CheckCheck className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {form.agentLanguages.map((l) => <Badge key={l} variant="outline" className="text-xs capitalize">{l.replace('-', ' ')}</Badge>)}
              <Badge variant="outline" className="text-xs capitalize">{form.agentGender}</Badge>
              <Badge variant="outline" className="text-xs capitalize">{form.agentTone}</Badge>
              {form.onlinePaymentsEnabled && <Badge variant="secondary" className="text-xs">Online payments</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
