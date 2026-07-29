'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Mic, Plus, Loader2, CheckCircle2, XCircle, Trash2, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

interface KeyRow {
  id: string
  provider: string
  alias: string
  keyMasked: string
  priority: number
  dailyBudgetUsd: number
  enabled: boolean
  model: string
  ttsModel: string
  sttModel: string
  lastError: string | null
  lastUsedAt: string | null
  callCount: number
  createdAt: string
}

const STT_MODELS = [
  { label: 'Assembly AI Best (Universal 3.5 Pro)', value: 'assemblyai-best' },
  { label: 'Assembly AI Speed (Universal 2)', value: 'assemblyai-speed' },
]

export function AssemblyAiClient({ sessionType, initialKeys }: { sessionType: string; initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    alias: '', apiKey: '', priority: '1', dailyBudgetUsd: '10', sttModel: 'assemblyai-best',
  })
  const [editForm, setEditForm] = useState<{ sttModel: string }>({ sttModel: '' })

  async function refreshKeys() {
    const fresh = await fetch('/api/llm-keys').then((r) => r.json())
    if (fresh.ok) {
      const assemblyKeys = fresh.data.filter((k: KeyRow) => k.provider === 'assemblyai')
      setKeys(assemblyKeys)
    }
  }

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
        provider: 'assemblyai',
        alias: form.alias,
        apiKey: form.apiKey,
        priority: Number(form.priority),
        dailyBudgetUsd: Number(form.dailyBudgetUsd),
        model: 'none',
        ttsModel: 'none',
        sttModel: form.sttModel,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed')
      return
    }
    toast.success('Assembly AI key added')
    setOpen(false)
    setForm({ alias: '', apiKey: '', priority: '1', dailyBudgetUsd: '10', sttModel: 'assemblyai-best' })
    await refreshKeys()
  }

  async function deleteKey(id: string) {
    if (!confirm('Delete this Assembly AI key?')) return
    setDeleting(id)
    const res = await fetch('/api/llm-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    setDeleting(null)
    if (!json.ok) {
      toast.error(json.error || 'Failed to delete')
      return
    }
    toast.success('Key deleted')
    await refreshKeys()
  }

  async function updateModel(id: string) {
    if (!editForm.sttModel) return
    setLoading(true)
    const res = await fetch('/api/llm-keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sttModel: editForm.sttModel }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed to update')
      return
    }
    toast.success('STT model updated')
    setEditing(null)
    await refreshKeys()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assembly AI — Speech-to-Text</h1>
          <p className="text-muted-foreground">
            Manage Assembly AI API keys for voice note transcription. Assembly AI uses an async upload→submit→poll flow with automatic language detection (98 languages including Urdu).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Key</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Assembly AI Key</DialogTitle>
              <DialogDescription>Get your key from assemblyai.com → Dashboard → API Keys. Keys are encrypted with AES-256-GCM.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Alias (nickname)</Label>
                <Input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="e.g., assemblyai-primary" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Paste Assembly AI API key..." />
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
              <div className="space-y-2">
                <Label>Speech Model</Label>
                <Select value={form.sttModel} onValueChange={(v) => setForm({ ...form, sttModel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Best: Universal 3.5 Pro (highest accuracy), Speed: Universal 2 (faster, lower cost)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addKey} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                Save Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {keys.map((k) => (
          <Card key={k.id}>
            <CardContent className="p-4">
              {editing === k.id ? (
                <div className="space-y-3">
                  <div className="font-medium mb-2">Edit Speech Model — {k.alias}</div>
                  <Select value={editForm.sttModel || k.sttModel} onValueChange={(v) => setEditForm({ sttModel: v })}>
                    <SelectTrigger><SelectValue placeholder="Speech Model" /></SelectTrigger>
                    <SelectContent>
                      {STT_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateModel(k.id)} disabled={loading}>
                      {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {k.alias}
                        {k.enabled ? <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assembly AI · {k.keyMasked} · {k.callCount} calls
                        {k.lastUsedAt && <> · last used {new Date(k.lastUsedAt).toLocaleDateString()}</>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Model: {k.sttModel === 'assemblyai-best' ? 'Universal 3.5 Pro' : 'Universal 2'}
                        {k.lastError && <span className="text-destructive ml-2">⚠ {k.lastError}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">P{k.priority}</Badge>
                    <Badge variant="outline">${k.dailyBudgetUsd}/d</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditForm({ sttModel: k.sttModel }); setEditing(k.id) }}>
                      <Settings2 className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteKey(k.id)} disabled={deleting === k.id}>
                      {deleting === k.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {keys.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Mic className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>No Assembly AI keys yet.</p>
              <p className="text-sm mt-1">Add your Assembly AI API key to enable voice note transcription.</p>
              <p className="text-xs mt-2 text-muted-foreground/70">
                Get your key from <a href="https://www.assemblyai.com/app" className="underline" target="_blank" rel="noopener">assemblyai.com/app</a>
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground space-y-2">
          <h3 className="font-semibold text-foreground">How Assembly AI Works</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Upload:</strong> Binary audio is uploaded to Assembly AI's servers</li>
            <li><strong>Submit:</strong> A transcript job is created with the upload URL</li>
            <li><strong>Poll:</strong> System polls every 2 seconds until transcription completes</li>
            <li><strong>Result:</strong> Text + detected language returned (supports Urdu, English, Punjabi, and 98+ languages)</li>
          </ol>
          <p className="text-xs mt-3">
            Models: <strong>Best</strong> = Universal 3.5 Pro (highest accuracy, multilingual), <strong>Speed</strong> = Universal 2 (faster, lower cost, good accuracy)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
