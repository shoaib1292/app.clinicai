'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Video, Plus, Loader2, CheckCircle2, XCircle, Trash2, Settings2 } from 'lucide-react'
import { toast } from 'sonner'

interface KeyRow {
  id: string
  alias: string
  keyMasked: string
  priority: number
  enabled: boolean
  minutesUsedToday: number
  dailyLimit: number
  lastError: string | null
  lastUsedAt: string | null
  roomCount: number
  createdAt: string
}

export function DailycoClient({ sessionType, initialKeys }: { sessionType: string; initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    alias: '', apiKey: '', priority: '1', dailyLimit: '300',
  })
  const [editForm, setEditForm] = useState<{ enabled?: boolean; priority?: number; dailyLimit?: number }>({})

  async function refreshKeys() {
    const res = await fetch('/api/dailyco-keys')
    const json = await res.json()
    if (json.ok) setKeys(json.data)
  }

  async function addKey() {
    if (!form.alias || !form.apiKey) {
      toast.error('Alias and API key required')
      return
    }
    setLoading(true)
    const res = await fetch('/api/dailyco-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alias: form.alias,
        apiKey: form.apiKey,
        priority: Number(form.priority),
        dailyLimit: Number(form.dailyLimit),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed to add key')
      return
    }
    toast.success('Daily.co key added')
    setOpen(false)
    setForm({ alias: '', apiKey: '', priority: '1', dailyLimit: '300' })
    await refreshKeys()
  }

  async function deleteKey(id: string) {
    if (!confirm('Delete this Daily.co key? Active rooms using this key will still work until they expire.')) return
    setDeleting(id)
    const res = await fetch('/api/dailyco-keys', {
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

  async function updateKey(id: string) {
    if (Object.keys(editForm).length === 0) return
    setLoading(true)
    const res = await fetch('/api/dailyco-keys', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed to update')
      return
    }
    toast.success('Key updated')
    setEditing(null)
    await refreshKeys()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily.co — Video Call Keys</h1>
          <p className="text-muted-foreground">
            Manage Daily.co API keys for telemedicine video calls. Keys rotate based on priority — when one hits its daily limit, the next key takes over.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Key</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Daily.co Key</DialogTitle>
              <DialogDescription>Get your key from dashboard.daily.co → Developers → API keys. Keys are encrypted with AES-256-GCM.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Alias (nickname)</Label>
                <Input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="e.g., dailyco-account-1" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Paste Daily.co API key..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority (1=highest)</Label>
                  <Input type="number" min={1} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Limit (minutes)</Label>
                  <Input type="number" min={1} value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Free tier: 10,000 min/month (~333/day). Recommended limit: 300/day (90% safety buffer).
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={addKey} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
                Save Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {keys.map((k) => {
          const pctUsed = k.dailyLimit > 0 ? Math.round((k.minutesUsedToday / k.dailyLimit) * 100) : 0
          const nearLimit = pctUsed >= 90
          return (
            <Card key={k.id}>
              <CardContent className="p-4">
                {editing === k.id ? (
                  <div className="space-y-3">
                    <div className="font-medium mb-2">Edit — {k.alias}</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Enabled</Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={editForm.enabled !== undefined ? String(editForm.enabled) : String(k.enabled)}
                          onChange={(e) => setEditForm({ ...editForm, enabled: e.target.value === 'true' })}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Priority</Label>
                        <Input type="number" min={1} value={editForm.priority ?? k.priority} onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Daily Limit (min)</Label>
                        <Input type="number" min={1} value={editForm.dailyLimit ?? k.dailyLimit} onChange={(e) => setEditForm({ ...editForm, dailyLimit: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateKey(k.id)} disabled={loading}>
                        {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {k.alias}
                          {k.enabled ? <CheckCircle2 className="w-3.5 h-3.5 text-chart-2" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Daily.co · {k.keyMasked} · {k.roomCount} rooms
                          {k.lastUsedAt && <> · last used {new Date(k.lastUsedAt).toLocaleDateString()}</>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-xs text-muted-foreground">
                            {k.minutesUsedToday}/{k.dailyLimit} min today
                          </div>
                          <div className={`h-1.5 w-20 rounded-full ${nearLimit ? 'bg-destructive/30' : 'bg-muted'}`}>
                            <div
                              className={`h-full rounded-full ${nearLimit ? 'bg-destructive' : 'bg-chart-2'}`}
                              style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            />
                          </div>
                          {nearLimit && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">near limit</Badge>}
                        </div>
                        {k.lastError && (
                          <div className="text-xs text-destructive mt-0.5">⚠ {k.lastError}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">P{k.priority}</Badge>
                      <Badge variant={nearLimit ? 'destructive' : 'outline'}>
                        {pctUsed}% used
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditForm({}); setEditing(k.id) }}>
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
          )
        })}
        {keys.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Video className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>No Daily.co keys yet.</p>
              <p className="text-sm mt-1">Add your Daily.co API key to enable telemedicine video calls.</p>
              <p className="text-xs mt-2 text-muted-foreground/70">
                Get your key from <a href="https://dashboard.daily.co/developers" className="underline" target="_blank" rel="noopener">dashboard.daily.co/developers</a>
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground space-y-2">
          <h3 className="font-semibold text-foreground">How Key Rotation Works</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Priority order:</strong> Lowest priority number is used first</li>
            <li><strong>Daily limit:</strong> Each key tracks minutes used today (resets at midnight)</li>
            <li><strong>Auto-rotate:</strong> When a key hits its daily limit, the next priority key takes over</li>
            <li><strong>Safety buffer:</strong> Default 300 min/day = 9,000/month (90% of free 10K tier)</li>
            <li><strong>Ongoing calls safe:</strong> Room stays active on the key that created it even if limit was hit after</li>
          </ol>
          <p className="text-xs mt-3">
            Daily.co free tier: <strong>10,000 minutes/month</strong> per account. Paid: $0.004/minute after free tier.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
