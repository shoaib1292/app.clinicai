'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Monitor, Globe, Palette, Layout, Eye, Settings, Smartphone, Monitor as Desktop, ExternalLink, Check, Loader2, Wand2, Pencil, Image, RefreshCw, Edit3, Maximize2, ArrowLeft, Save, Blocks, X } from 'lucide-react'
import { listTemplates } from '@/components/website/template-registry'
import { listThemes } from '@/components/website/theme-registry'
import { LEGACY_BLOCK_MAP } from '@/components/website/blocks/registry'
import { AIWizard } from './components/ai-wizard'
import { BlockEditor } from './components/block-editor'
import type { TemplateInfo } from '@/components/website/template-registry'
import type { ThemeInfo } from '@/components/website/theme-registry'
import type { BlockConfig } from '@/components/website/blocks/types'

interface ClinicWebsite {
  name: string | null
  websiteEnabled: boolean
  themeId: string | null
  templateId: string | null
  brandColor: string | null
  customDomain: string | null
  customDomainVerified: boolean
  tagline: string | null
  description: string | null
  heroImageUrl: string | null
  aiGeneratedContent: Record<string, any> | null
  sectionVisibility: Record<string, boolean> | null
  headingFont: string | null
  bodyFont: string | null
  galleryImages: any[] | null
  blocksConfig: BlockConfig[] | null
  slug: string
}

// Legacy editor section id → human label. The IDs are mapped to real block
// IDs via LEGACY_BLOCK_MAP before being persisted to blocksConfig.
const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero Section', about: 'About Clinic', doctors: 'Our Doctors',
  services: 'Our Services', gallery: 'Photo Gallery', testimonials: 'Patient Testimonials',
  cta: 'Book Now CTA', contact: 'Contact Info',
}

const DEFAULT_SECTIONS: Record<string, boolean> = {
  hero: true, about: true, doctors: true, services: true,
  gallery: false, testimonials: false, cta: true, contact: true,
}

/**
 * Build the live-preview URL for a clinic.
 * Local dev: subdomain (slug.localhost:8000) via proxy.ts rewrite
 * Tunnel/prod: same-origin path (/website/[slug]) — no wildcard DNS needed
 */
function buildPreviewUrl(slug: string): string {
  if (typeof window === 'undefined') return `https://${slug}.clinicai.pk`
  const { protocol, hostname, port } = window.location
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1'
  const portStr = port ? `:${port}` : ''
  if (isLocalDev) {
    return `${protocol}//${slug}.localhost${portStr}`
  }
  return `${protocol}//${hostname}${portStr}/website/${slug}`
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Geist', label: 'Geist' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
]

export function WebsiteBuilderClient({ clinicId, immersive, onEnterImmersive, onExitImmersive }: { clinicId: string; immersive?: boolean; onEnterImmersive?: () => void; onExitImmersive?: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [previewKey, setPreviewKey] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [website, setWebsite] = useState<ClinicWebsite | null>(null)
  const [activeTab, setActiveTab] = useState('quick')
  const [blocksPanelOpen, setBlocksPanelOpen] = useState(false)

  // State
  const [customDomain, setCustomDomain] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [brandColor, setBrandColor] = useState('#111111')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [headingFont, setHeadingFont] = useState('Inter')
  const [bodyFont, setBodyFont] = useState('Inter')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)

  const [templates] = useState<TemplateInfo[]>(() => { try { return listTemplates() } catch { return [] } })
  const [themes] = useState<ThemeInfo[]>(() => { try { return listThemes() } catch { return [] } })

  useEffect(() => { fetchWebsite() }, [])

  async function fetchWebsite() {
    try {
      const res = await fetch(`/api/clinics/${clinicId}/website`)
      const json = await res.json()
      if (json.ok) {
        const d = json.data
        setWebsite(d)
        setCustomDomain(d.customDomain || '')
        setBrandColor(d.brandColor || '#111111')
        setTagline(d.tagline || '')
        setDescription(d.description || '')
        setHeadingFont(d.headingFont || 'Inter')
        setBodyFont(d.bodyFont || 'Inter')
        setHeroImageUrl(d.heroImageUrl || '')
      }
    } catch (err) {
      console.error('Failed to load website settings', err)
    } finally { setLoading(false) }
  }

  async function save(updates: Record<string, any>) {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const res = await fetch(`/api/clinics/${clinicId}/website`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('Settings saved')
        fetchWebsite()
        setPreviewKey(k => k + 1)
        router.refresh()
      } else {
        toast.error(json.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHero(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (json.ok) {
        setHeroImageUrl(json.data.url)
        save({ heroImageUrl: json.data.url })
      } else {
        toast.error('Upload failed')
      }
    } catch {
      toast.error('Failed to upload image')
    } finally { setUploadingHero(false) }
  }

  async function verifyDomain() {
    if (!customDomain) return
    setVerifying(true)
    try {
      const meRes = await fetch('/api/auth/me')
      const meJson = await meRes.json()
      const cId = meJson?.data?.clinicId || meJson?.data?.clinic?.id
      const res = await fetch(`/api/clinics/${cId}/website/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain }),
      })
      const json = await res.json()
      if (json.ok) {
        toast.success(json.data?.verified ? 'Domain verified!' : `Domain saved. Add CNAME: ${json.data?.requiredRecord}`)
        fetchWebsite()
      } else {
        toast.error(json.error || 'Verification failed')
      }
    } catch {
      toast.error('Failed to verify domain')
    } finally { setVerifying(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  if (!website) {
    return <div className="py-20 text-center text-muted-foreground">Unable to load website settings. Please try again.</div>
  }

  const previewUrl = buildPreviewUrl(website.slug)

  // Reverse map: new blockId → legacy editor section id (for labels/UI keys)
  const blockIdToLegacy: Record<string, string> = {}
  for (const [legacyId, newId] of Object.entries(LEGACY_BLOCK_MAP)) {
    blockIdToLegacy[newId] = legacyId
  }

  // Build editor block list from blocksConfig (new model) when present,
  // otherwise fall back to the legacy sectionVisibility/aiGeneratedContent.
  const blockEditorBlocks = (() => {
    const cfg = website.blocksConfig
    if (cfg && cfg.length > 0) {
      return cfg
        .filter(b => blockIdToLegacy[b.blockId]) // only show sections the editor knows about
        .map((b, idx) => ({
          id: blockIdToLegacy[b.blockId],
          label: BLOCK_LABELS[blockIdToLegacy[b.blockId]] || b.blockId,
          visible: b.visible !== false,
          order: typeof b.order === 'number' ? b.order : idx,
          content: b.content && Object.keys(b.content).length > 0 ? b.content : undefined,
        }))
    }
    // Legacy fallback
    return Object.entries(BLOCK_LABELS).map(([id, label], idx) => {
      const visibility = website.sectionVisibility || DEFAULT_SECTIONS
      return {
        id, label,
        visible: visibility[id] ?? DEFAULT_SECTIONS[id] ?? true,
        order: idx,
        content: website.aiGeneratedContent?.[id]
          ? (() => {
              const c = website.aiGeneratedContent[id]
              if (typeof c === 'string') return { text: c }
              if (typeof c === 'object' && c !== null) {
                const flat: Record<string, any> = {}
                for (const [k, v] of Object.entries(c)) {
                  if (typeof v === 'string') flat[k] = v
                }
                return flat
              }
              return undefined
            })()
          : undefined,
      }
    })
  })()

  async function handleBlockEditorSave(blocks: Array<{ id: string; label: string; visible: boolean; order: number; content?: Record<string, any> }>, _content: Record<string, any>, hdFont?: string, bdFont?: string) {
    // Merge editor changes into existing blocksConfig so non-editor blocks
    // (footer, faq, etc. added by the AI wizard) are preserved.
    const existing = website?.blocksConfig || []
    const existingByLegacy: Record<string, BlockConfig> = {}
    for (const b of existing) {
      const legacyId = blockIdToLegacy[b.blockId]
      if (legacyId) existingByLegacy[legacyId] = b
    }

    const editorConfig: BlockConfig[] = blocks.map((b, idx) => {
      const newId = LEGACY_BLOCK_MAP[b.id] || b.id
      const prev = existingByLegacy[b.id]
      return {
        blockId: newId as BlockConfig['blockId'],
        order: idx,
        visible: b.visible,
        content: b.content || prev?.content || {},
      }
    })

    // Keep non-editor blocks (footer, faq, ...) in their relative order at the end.
    const editorIds = new Set(editorConfig.map(b => b.blockId))
    const preserved = existing
      .filter(b => !editorIds.has(b.blockId) && !blockIdToLegacy[b.blockId])
      .sort((a, b) => a.order - b.order)

    // Reindex orders across the merged set.
    const merged = [...editorConfig, ...preserved].map((b, i) => ({ ...b, order: i }))

    // Merge fonts into a single API call
    const updates: Record<string, any> = { blocksConfig: merged }
    if (hdFont !== undefined) updates.headingFont = hdFont
    if (bdFont !== undefined) updates.bodyFont = bdFont

    await save(updates)
  }

  // ─── IMMERSIVE MODE: GHL-style full-page editor ───
  // No tabs, no dashboard chrome. Top bar = exit + save + device toggle.
  // Left = blocks list panel (toggleable). Center = large preview canvas.
  if (immersive) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-muted/30">
        {/* Top bar */}
        <div className="h-12 shrink-0 border-b border-border/60 bg-card flex items-center gap-2 px-3 z-20">
          <button
            onClick={onExitImmersive}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Exit editor"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit
          </button>
          <div className="w-px h-6 bg-border/60 mx-1" />
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Monitor className="w-4 h-4 text-primary" />
            {website.name || 'Website Builder'}
          </div>

          <div className="flex-1" />

          {/* Blocks panel toggle */}
          <Button
            variant={blocksPanelOpen ? 'secondary' : 'ghost'}
            size="sm" className="gap-1.5 h-8 text-xs"
            onClick={() => setBlocksPanelOpen(o => !o)}
          >
            <Blocks className="w-3.5 h-3.5" />
            Blocks
          </Button>

          {/* Inline edit toggle */}
          <Button
            variant={editMode ? 'secondary' : 'ghost'}
            size="sm" className="gap-1.5 h-8 text-xs"
            onClick={() => { setEditMode(!editMode); setPreviewKey(k => k + 1) }}
            title="Toggle inline editing"
          >
            <Pencil className="w-3.5 h-3.5" />
            {editMode ? 'Editing On' : 'Edit Text'}
          </Button>

          {/* Device toggle */}
          <div className="flex items-center gap-0.5 border border-border/60 rounded-lg p-0.5">
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Mobile view"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Desktop view"
            >
              <Desktop className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-6 bg-border/60 mx-1" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewKey(k => k + 1)} title="Refresh preview">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="default" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={() => save({ websiteEnabled: true })}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Publish
          </Button>
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0">
            <span>Click any text on the website to edit it inline.</span>
            <button onClick={() => { setEditMode(false); setPreviewKey(k => k + 1) }} className="font-medium hover:underline">Done</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Blocks panel (left) */}
          {blocksPanelOpen && (
            <div className="w-72 shrink-0 border-r border-border/60 bg-background overflow-y-auto p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Blocks</span>
                <button onClick={() => setBlocksPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <BlockEditor
                clinicId={clinicId}
                initialBlocks={blockEditorBlocks}
                initialContent={website.aiGeneratedContent}
                templateId={website.templateId || 'single-page'}
                headingFont={headingFont}
                bodyFont={bodyFont}
                onSave={handleBlockEditorSave}
              />
            </div>
          )}

          {/* Preview canvas */}
          <div className="flex-1 flex items-start justify-center overflow-auto p-4">
            <div className={`
              bg-white rounded-lg shadow-lg border border-border overflow-hidden transition-all
              ${previewDevice === 'mobile' ? 'w-[390px]' : 'w-full max-w-6xl'}
            `}>
              {previewDevice === 'mobile' && (
                <div className="bg-muted px-3 py-1.5 text-[10px] text-center text-muted-foreground border-b">
                  390px · Mobile preview
                </div>
              )}
              <iframe
                key={previewKey}
                src={`${previewUrl}${editMode ? '?edit=1' : ''}`}
                className={`w-full border-0 ${editMode ? 'ring-2 ring-inset ring-primary/50' : ''}`}
                style={{ height: 'calc(100vh - 3rem - 2rem)', width: previewDevice === 'mobile' ? 390 : '100%' }}
                title="Website Preview"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${immersive ? 'h-full' : 'gap-4 h-[calc(100vh-8rem)]'}`}>
      {/* Left: Builder */}
      <div className={`flex-1 overflow-y-auto ${immersive ? 'px-6' : 'pr-2'} space-y-4`}>
        <div className={`flex items-center justify-between sticky top-0 bg-background z-10 py-2 ${immersive ? '' : ''}`}>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Website Builder</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Create your clinic&apos;s branded website.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPreviewKey(k => k + 1)} variant="ghost" size="icon" title="Refresh preview"><RefreshCw className="w-4 h-4" /></Button>
            <Button onClick={() => window.open(previewUrl, '_blank')} disabled={!website.websiteEnabled} variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" /> View Site
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick" className="gap-1.5"><Settings className="w-4 h-4" /> Quick Setup</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5"><Wand2 className="w-4 h-4" /> AI Wizard</TabsTrigger>
            <TabsTrigger value="blocks" className="gap-1.5"><Pencil className="w-4 h-4" /> Edit Blocks</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 pt-4">
            {/* Enable */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="w-4 h-4" />Website Status</CardTitle><CardDescription>Enable to publish your clinic website.</CardDescription></CardHeader>
              <CardContent className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Website {website.websiteEnabled ? 'Enabled' : 'Disabled'}</p><p className="text-xs text-muted-foreground">{website.websiteEnabled ? 'Patients can visit your website.' : 'Website is not public.'}</p></div>
                <Switch checked={website.websiteEnabled} onCheckedChange={v => save({ websiteEnabled: v })} />
              </CardContent>
            </Card>

            {/* Domain */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Domain</CardTitle><CardDescription>Your website address.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Free Subdomain</p><p className="text-sm font-mono truncate">{website.slug}.clinicai.pk</p></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Custom Domain (optional)</Label>
                  <div className="flex gap-2">
                    <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="dr-ahmed.pk" className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={verifyDomain} disabled={verifying || !customDomain}>
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verify
                    </Button>
                  </div>
                  {website.customDomain && <p className="text-xs text-muted-foreground">{website.customDomainVerified ? '✅ Verified' : '⏳ Add CNAME: app.clinicai.pk'}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Template */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layout className="w-4 h-4" />Template</CardTitle><CardDescription>Choose how sections are arranged.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => save({ templateId: t.id })}
                      className={`p-4 rounded-xl border text-center transition-all ${website.templateId === t.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'}`}>
                      <Layout className={`w-6 h-6 mx-auto mb-2 ${website.templateId === t.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.blockCount} blocks</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Theme */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" />Theme</CardTitle><CardDescription>Pick a visual style for your website.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {themes.map(t => (
                    <button key={t.id} onClick={() => save({ themeId: t.id })}
                      className={`p-3 rounded-xl border text-center transition-all ${website.themeId === t.id ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
                      <div className="w-full h-10 rounded-lg mb-2 border" style={{ background: t.previewColor }} />
                      <p className="text-xs font-medium">{t.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fonts */}
            <Card>
              <CardHeader><CardTitle className="text-base">Typography</CardTitle><CardDescription>Choose fonts for headings and body text.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Heading Font</Label>
                    <Select value={headingFont} onValueChange={v => { setHeadingFont(v); save({ headingFont: v }) }}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Body Font</Label>
                    <Select value={bodyFont} onValueChange={v => { setBodyFont(v); save({ bodyFont: v }) }}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hero Image */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Image className="w-4 h-4" />Hero Image</CardTitle><CardDescription>Full-width hero photo for your homepage.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {heroImageUrl && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden">
                    <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input type="url" value={heroImageUrl} onChange={e => setHeroImageUrl(e.target.value)} placeholder="https://... or upload below" className="text-sm" />
                  <Button size="sm" variant="outline" onClick={() => save({ heroImageUrl })} disabled={saving}>Set</Button>
                </div>
                <div className="flex gap-2 items-center">
                  <Label htmlFor="hero-upload" className="cursor-pointer">
                    <Button variant="secondary" size="sm" disabled={uploadingHero} asChild>
                      <span>{uploadingHero ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Image className="w-4 h-4 mr-1" />}Upload Photo</span>
                    </Button>
                  </Label>
                  <Input id="hero-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <span className="text-xs text-muted-foreground">Recommended: 1400×600</span>
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" />Branding</CardTitle><CardDescription>Your clinic&apos;s brand identity.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Brand Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
                    <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="flex-1 font-mono text-sm" />
                    <Button size="sm" onClick={() => save({ brandColor })} disabled={saving}>Apply</Button>
                  </div>
                </div>
                <div><Label className="text-xs">Tagline</Label><Input value={tagline} onChange={e => setTagline(e.target.value)} onBlur={() => save({ tagline })} placeholder="Your Health, Our Priority" className="mt-1" /></div>
                <div><Label className="text-xs">About / Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={() => save({ description })} placeholder="Write about your clinic..." rows={3} className="mt-1" /></div>
              </CardContent>
            </Card>

            {/* Publish */}
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div><p className="font-medium">Ready to publish?</p><p className="text-sm text-muted-foreground">{website.websiteEnabled ? 'Your website is live.' : 'Enable the website to go live.'}</p></div>
                <Button onClick={() => save({ websiteEnabled: !website.websiteEnabled })} disabled={saving}>
                  {saving ? 'Saving...' : website.websiteEnabled ? 'Unpublish' : 'Publish Website'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="pt-4">
            <AIWizard clinicId={clinicId} slug={website.slug} onComplete={() => { fetchWebsite(); setActiveTab('blocks') }} />
          </TabsContent>

          <TabsContent value="blocks" className="pt-4">
            <BlockEditor
              clinicId={clinicId}
              initialBlocks={blockEditorBlocks}
              initialContent={website.aiGeneratedContent}
              templateId={website.templateId || 'single-page'}
              headingFont={headingFont}
              bodyFont={bodyFont}
              onSave={handleBlockEditorSave}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: Live Preview */}
      <div className={`
        flex-col border rounded-xl overflow-hidden bg-muted/30
        ${immersive
          ? 'flex w-[480px] shrink-0'
          : 'hidden xl:flex'
        }
      `} style={{ width: !immersive && previewDevice === 'mobile' ? 390 : immersive ? 480 : 540 }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-card shrink-0">
          <span className="text-xs font-medium text-muted-foreground">Live Preview</span>
          <div className="flex gap-1">
            <Button
              variant={editMode ? 'secondary' : 'ghost'}
              size="icon" className="h-7 w-7"
              onClick={() => { setEditMode(!editMode); setPreviewKey(k => k + 1) }}
              title={editMode ? 'Exit edit mode' : 'Toggle inline editing'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setPreviewDevice('mobile')} title="Mobile view">
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
            <Button variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setPreviewDevice('desktop')} title="Desktop view">
              <Desktop className="w-3.5 h-3.5" />
            </Button>
            {!immersive && onEnterImmersive && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEnterImmersive} title="Full-page editor">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Edit Mode Banner */}
        {editMode && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Edit3 className="w-3 h-3" />
                <span>Click any text on the preview to edit it inline.</span>
              </div>
              <button
                onClick={() => { setEditMode(false); setPreviewKey(k => k + 1) }}
                className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* iframe */}
        <iframe
          key={previewKey}
          src={`${previewUrl}${editMode ? '?edit=1' : ''}`}
          className={`flex-1 w-full border-0 ${editMode ? 'ring-2 ring-inset ring-primary/50' : ''}`}
          style={{ width: previewDevice === 'mobile' ? 390 : '100%' }}
          title="Website Preview"
        />
      </div>
    </div>
  )
}
