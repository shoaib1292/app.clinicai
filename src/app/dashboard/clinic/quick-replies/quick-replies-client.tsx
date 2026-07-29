'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Zap, Plus, Save, Trash2, Loader2, GripVertical, Pencil, X, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Snippet {
  id: string
  label: string
  body: string
  category: string
  sortIdx: number
  enabled: boolean
  createdAt: string
}

const CATEGORIES = [
  { value: 'greeting', label: 'Greeting', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  { value: 'booking', label: 'Booking', color: 'bg-brand/10 text-brand border-brand/20' },
  { value: 'payment', label: 'Payment', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  { value: 'info', label: 'Info', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20' },
  { value: 'general', label: 'General', color: 'bg-muted text-muted-foreground border-border' },
]

export function QuickRepliesClient() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', body: '', category: 'general' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/quick-replies')
      const j = await r.json()
      if (j.ok) setSnippets(j.data.snippets)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm({ label: '', body: '', category: 'general' })
    setEditingId(null)
    setShowForm(false)
  }

  async function save() {
    if (!form.label.trim() || !form.body.trim()) {
      toast.error('Label and body are required')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        // Update
        const r = await fetch(`/api/quick-replies/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const j = await r.json()
        if (j.ok) {
          toast.success('Snippet updated')
          resetForm()
          load()
        } else toast.error(j.error || 'Failed')
      } else {
        // Create
        const r = await fetch('/api/quick-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const j = await r.json()
        if (j.ok) {
          toast.success('Snippet created')
          resetForm()
          load()
        } else toast.error(j.error || 'Failed')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggle(snippet: Snippet) {
    setSnippets((prev) => prev.map((s) => s.id === snippet.id ? { ...s, enabled: !s.enabled } : s))
    await fetch(`/api/quick-replies/${snippet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !snippet.enabled }),
    })
  }

  async function remove(id: string) {
    setSnippets((prev) => prev.filter((s) => s.id !== id))
    const r = await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' })
    const j = await r.json()
    if (j.ok) toast.success('Snippet deleted')
    else { toast.error('Failed to delete'); load() }
  }

  function edit(snippet: Snippet) {
    setEditingId(snippet.id)
    setForm({ label: snippet.label, body: snippet.body, category: snippet.category })
    setShowForm(true)
  }

  const enabledCount = snippets.filter((s) => s.enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand" />
            Quick Reply Snippets
          </h1>
          <p className="text-muted-foreground">Custom canned responses for staff during conversation takeover</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Zap className="w-3 h-3 text-brand" />
            {enabledCount}/{snippets.length} active
          </Badge>
          {!showForm && (
            <Button onClick={() => { setEditingId(null); setForm({ label: '', body: '', category: 'general' }); setShowForm(true) }}>
              <Plus className="w-4 h-4 mr-1" />New snippet
            </Button>
          )}
        </div>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <Card className="border-brand/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {editingId ? <Pencil className="w-4 h-4 text-brand" /> : <Plus className="w-4 h-4 text-brand" />}
              {editingId ? 'Edit snippet' : 'New snippet'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Label (short chip text, max 50)</label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Clinic timing"
                  maxLength={50}
                  className="focus-brand"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Body (full message, max 1024)</label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3}
                maxLength={1024}
                placeholder="e.g. Clinic ki timing 9am se 9pm tak hai, har roz."
                className="focus-brand resize-none"
              />
              <div className="text-[10px] text-muted-foreground mt-1 text-right">{form.body.length}/1024</div>
            </div>
            {/* Preview chip */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${CATEGORIES.find((c) => c.value === form.category)?.color}`}>
                {form.label || 'Label'}
              </span>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snippet list */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4 space-y-2">
              <div className="skeleton h-5 w-1/4" />
              <div className="skeleton h-12 w-full" />
            </CardContent></Card>
          ))}
        </div>
      ) : snippets.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <div className="icon-wrap"><Zap className="w-6 h-6" /></div>
            <div className="font-medium">No custom snippets yet</div>
            <div className="text-xs">Create your first snippet to speed up manual replies during conversation takeover.</div>
            {!showForm && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Create snippet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {snippets.map((s) => {
            const cat = CATEGORIES.find((c) => c.value === s.category) || CATEGORIES[4]
            return (
              <Card key={s.id} className={!s.enabled ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${cat.color}`}>{s.label}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{cat.label}</Badge>
                        {!s.enabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                      </div>
                      <div className="text-sm text-foreground/85 whitespace-pre-wrap bg-muted/30 rounded-md p-2.5">{s.body}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} />
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(s)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => remove(s.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> Snippets appear in the Quick Replies panel during conversation takeover,
            separated from the 8 built-in defaults. Use short labels and clear Roman-Urdu body text for fastest access.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
