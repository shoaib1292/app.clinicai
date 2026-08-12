'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { KeyRound, Plus, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface KeyRow {
  id: string
  alias: string
  encryptedKey: string
  baseUrl: string
  enabled: boolean
  lastError: string | null
  lastUsedAt: Date | null
  createdAt: Date
}

export function EvolutionKeysClient({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ alias: '', apiKey: '', baseUrl: 'https://evo.clinicai.pk' })

  async function addKey() {
    if (!form.alias || !form.apiKey) {
      toast.error('Alias and API key required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/evolution-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alias: form.alias,
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed')
      return
    }
    toast.success('Evolution API key added')
    setOpen(false)
    setForm({ alias: '', apiKey: '', baseUrl: 'https://evo.clinicai.pk' })
    const fresh = await fetch('/api/evolution-keys').then((r) => r.json())
    if (fresh.ok) setKeys(fresh.data)
  }

  async function deleteKey(id: string, alias: string) {
    if (!confirm(`Delete "${alias}"? This cannot be undone.`)) return
    setLoading(true)
    const res = await fetch(`/api/evolution-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed to delete')
      return
    }
    toast.success(`Deleted "${alias}"`)
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evolution API Keys</h1>
          <p className="text-muted-foreground">Global keys for WhatsApp connection management. The first enabled key is used for all clinics.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Key</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Evolution API Key</DialogTitle>
              <DialogDescription>This is your Evolution server's global AUTHENTICATION_API_KEY. Stored encrypted with AES-256-GCM.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Alias (nickname)</Label>
                <Input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="e.g., evolution-primary" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Evolution global API key" />
              </div>
              <div className="space-y-2">
                <Label>Evolution Server URL</Label>
                <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://evo.clinicai.pk" />
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
                  <div className="text-xs text-muted-foreground">{k.encryptedKey} · {k.baseUrl}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {k.lastError && <Badge variant="destructive" className="text-xs">Error</Badge>}
                {k.lastUsedAt && <Badge variant="secondary" className="text-xs">Last: {new Date(k.lastUsedAt).toLocaleString('en-PK')}</Badge>}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteKey(k.id, k.alias)} disabled={loading}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {keys.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No Evolution keys yet. Add your server's global API key here instead of .env.</CardContent></Card>
        )}
      </div>
    </div>
  )
}
