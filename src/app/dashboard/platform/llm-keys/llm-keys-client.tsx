'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { KeyRound, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface KeyRow {
  id: string
  provider: string
  alias: string
  encryptedKey: string
  priority: number
  dailyBudgetUsd: number
  enabled: boolean
  lastError: string | null
  lastUsedAt: Date | null
  _count: { callLogs: number }
  createdAt: Date
}

export function LlmKeysClient({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ provider: 'zai', alias: '', apiKey: '', priority: '1', dailyBudgetUsd: '50' })

  async function addKey() {
    if (!form.alias || !form.apiKey) {
      toast.error('Alias and API key required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/llm-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: form.provider,
        alias: form.alias,
        apiKey: form.apiKey,
        priority: Number(form.priority),
        dailyBudgetUsd: Number(form.dailyBudgetUsd),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed')
      return
    }
    toast.success('LLM key added')
    setOpen(false)
    setForm({ provider: 'zai', alias: '', apiKey: '', priority: '1', dailyBudgetUsd: '50' })
    // Refresh
    const fresh = await fetch('/api/llm-keys').then((r) => r.json())
    if (fresh.ok) setKeys(fresh.data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM Keys</h1>
          <p className="text-muted-foreground">Platform-controlled keys with priority round-robin + failover + budget hard-stop</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Key</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add LLM Key</DialogTitle>
              <DialogDescription>Stored encrypted with AES-256-GCM. Used for all clinics' AI agent calls.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zai">Z.AI (default)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="local">Local (Ollama)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alias (nickname)</Label>
                <Input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="e.g., zai-primary" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority (1=highest)</Label>
                  <Input type="number" min={1} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Budget (USD)</Label>
                  <Input type="number" step="0.01" value={form.dailyBudgetUsd} onChange={(e) => setForm({ ...form, dailyBudgetUsd: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addKey} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Save Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {keys.map((k) => (
          <Card key={k.id}>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {k.alias}
                    {k.enabled ? <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{k.provider} · {k.encryptedKey} · {k._count.callLogs} calls</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">Priority {k.priority}</Badge>
                <Badge variant="outline">${k.dailyBudgetUsd}/day</Badge>
                {k.lastError && <Badge variant="destructive" className="text-xs">Error</Badge>}
                {k.lastUsedAt && <Badge variant="secondary" className="text-xs">Last: {new Date(k.lastUsedAt).toLocaleString('en-PK')}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
        {keys.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No LLM keys yet. Add one to enable the AI agent.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
