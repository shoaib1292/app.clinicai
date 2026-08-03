'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Upload, Save, Palette, Stethoscope, Bot, MapPin } from 'lucide-react'

const FONT_OPTIONS = ['Inter', 'Poppins', 'Playfair Display', 'Geist', 'DM Sans', 'Space Grotesk']

interface BrandingTabProps {
  clinicId: string
  initialData: {
    name: string
    tagline: string | null
    description: string | null
    brandColor: string | null
    headingFont: string | null
    bodyFont: string | null
    logoUrl: string | null
    logoKey: string | null
    latitude: number | null
    longitude: number | null
    whatsappNumber: string | null
    phone: string | null
    address: string | null
    city: string | null
    agentName: string
    agentGender: string
    agentTone: string
    agentLanguages: string
    agentWelcome: string
    agentFallback: string
    clinicStats: string | null
  }
  doctors: Array<{
    id: string
    name: string
    speciality: string
    qualifications: string | null
    imageKey: string | null
    bio: string | null
    languages: string | null
    displayOnWebsite: boolean
  }>
}

export function ClinicBrandingTab({ clinicId, initialData, doctors }: BrandingTabProps) {
  const [saving, setSaving] = useState(false)
  const [brandColor, setBrandColor] = useState(initialData.brandColor || '#111111')
  const [headingFont, setHeadingFont] = useState(initialData.headingFont || 'Inter')
  const [bodyFont, setBodyFont] = useState(initialData.bodyFont || 'Inter')
  const [tagline, setTagline] = useState(initialData.tagline || '')
  const [description, setDescription] = useState(initialData.description || '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [stats, setStats] = useState(() => {
    try { return initialData.clinicStats ? JSON.parse(initialData.clinicStats) : {} } catch { return {} }
  })

  const [agentName, setAgentName] = useState(initialData.agentName || 'Sana')
  const [agentGender, setAgentGender] = useState(initialData.agentGender || 'female')
  const [agentTone, setAgentTone] = useState(initialData.agentTone || 'friendly')
  const [agentLanguages, setAgentLanguages] = useState(initialData.agentLanguages || 'urdu,english')
  const [agentWelcome, setAgentWelcome] = useState(initialData.agentWelcome || '')
  const [agentFallback, setAgentFallback] = useState(initialData.agentFallback || '')

  const [uploadingLogo, setUploadingLogo] = useState(false)

  async function uploadLogo() {
    if (!logoFile) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', logoFile)
      fd.append('type', 'logo')
      fd.append('clinicId', clinicId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      toast.success('Logo uploaded')
      window.dispatchEvent(new CustomEvent('clinic-logo-updated', { detail: json.imageKey }))
    } catch { toast.error('Upload failed') }
    finally { setUploadingLogo(false) }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clinics/${clinicId}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandColor, headingFont, bodyFont, tagline, description,
          agentName, agentGender, agentTone, agentLanguages, agentWelcome, agentFallback,
          clinicStats: JSON.stringify(stats),
        }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error) } else { toast.success('Branding saved') }
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Branding &amp; Info</h2>
          <p className="text-sm text-muted-foreground">Unified identity for your website, portal, and AI agent.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save All
        </Button>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="colors">Colors &amp; Fonts</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="agent">AI Agent</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ─── IDENTITY ─── */}
        <TabsContent value="identity" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl flex items-center justify-center overflow-hidden border" style={{ backgroundColor: brandColor ? `${brandColor}15` : 'var(--muted)' }}>
                {initialData.logoKey ? (
                  <img src={`https://cdn.clinicai.pk/${initialData.logoKey}/100.webp`} alt="Logo" className="w-full h-full object-contain" />
                ) : initialData.logoUrl ? (
                  <img src={initialData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold opacity-30">{initialData.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1">
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                <Button size="sm" className="mt-2" onClick={uploadLogo} disabled={!logoFile || uploadingLogo}>
                  {uploadingLogo ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />} Upload
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Clinic Info</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Tagline</Label><Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Short punchline for your clinic" /></div>
                <div><Label>WhatsApp Number</Label><Input value={initialData.whatsappNumber || ''} readOnly className="bg-muted" /></div>
              </div>
              <div><Label>Description / About</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Long description for website hero and about section" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div><Label>City</Label><Input value={initialData.city || ''} readOnly className="bg-muted" /></div>
              <div><Label>Address</Label><Input value={initialData.address || ''} readOnly className="bg-muted" /></div>
              <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {initialData.latitude && initialData.longitude
                  ? `Lat: ${initialData.latitude?.toFixed(5)}, Lng: ${initialData.longitude?.toFixed(5)}`
                  : 'Set your clinic location on Google Maps in the Profile tab'}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── COLORS & FONTS ─── */}
        <TabsContent value="colors" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle><Palette className="h-5 w-5 inline mr-2" />Brand Color</CardTitle>
              <CardDescription>This color drives your website, patient portal, and agent theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                  className="h-12 w-12 rounded-lg border cursor-pointer" />
                <code className="text-sm">{brandColor}</code>
              </div>
              <div className="flex gap-2">
                {['#111111', '#0891b2', '#059669', '#7c3aed', '#dc2626', '#d97706', '#2563eb', '#db2777'].map(c => (
                  <button key={c} onClick={() => setBrandColor(c)}
                    className="h-8 w-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{ backgroundColor: c, borderColor: brandColor === c ? brandColor : 'transparent' }} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Typography</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Heading Font</Label>
                <Select value={headingFont} onValueChange={setHeadingFont}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Body Font</Label>
                <Select value={bodyFont} onValueChange={setBodyFont}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 mt-4 p-4 rounded-xl border">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <h3 className="text-2xl font-bold mb-1" style={{ fontFamily: headingFont }}>The quick brown fox</h3>
                <p style={{ fontFamily: bodyFont }}>A calm, professional body text that's easy to read. Your patients deserve clarity.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DOCTORS ─── */}
        <TabsContent value="doctors" className="space-y-6 mt-6">
          {doctors.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No doctors added yet.</CardContent></Card>
          ) : doctors.map(doc => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16 rounded-xl">
                  {doc.imageKey ? (
                    <AvatarImage src={`https://cdn.clinicai.pk/${doc.imageKey}/100.webp`} />
                  ) : null}
                  <AvatarFallback className="text-xl font-bold rounded-xl" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>
                    {doc.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">{doc.name}</CardTitle>
                  <CardDescription>{doc.speciality}{doc.qualifications ? ` · ${doc.qualifications}` : ''}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Show on website</Label>
                  <Switch checked={doc.displayOnWebsite} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <Label className="text-xs">Bio</Label>
                  <Textarea rows={2} defaultValue={doc.bio || ''} placeholder="Brief professional bio" className="text-sm" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Languages</Label>
                    <Input defaultValue={doc.languages || ''} placeholder="urdu,english" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Photo</Label>
                    <Input type="file" accept="image/*" className="text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-1">Need transparent background? Use <a href="https://remove.bg" target="_blank" rel="noopener" className="underline">remove.bg</a></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── AI AGENT ─── */}
        <TabsContent value="agent" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle><Bot className="h-5 w-5 inline mr-2" />AI Assistant Persona</CardTitle>
              <CardDescription>This persona is used by the WhatsApp agent and website chat widget.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Agent Name</Label>
                  <Input value={agentName} onChange={e => setAgentName(e.target.value)} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={agentGender} onValueChange={setAgentGender}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tone</Label>
                  <Select value={agentTone} onValueChange={setAgentTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Languages (comma separated)</Label>
                <Input value={agentLanguages} onChange={e => setAgentLanguages(e.target.value)} placeholder="urdu,english,roman-urdu" />
              </div>
              <div>
                <Label>Welcome Message</Label>
                <Textarea value={agentWelcome} onChange={e => setAgentWelcome(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Fallback Message</Label>
                <Textarea value={agentFallback} onChange={e => setAgentFallback(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── STATS ─── */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinic Statistics</CardTitle>
              <CardDescription>These show on your website stats counters block. Leave blank to hide.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Years of Experience</Label>
                <Input type="number" value={stats.yearsOfExperience || ''} onChange={e => setStats({ ...stats, yearsOfExperience: e.target.value ? Number(e.target.value) : undefined })} placeholder="15" />
              </div>
              <div>
                <Label>Total Patients Served</Label>
                <Input type="number" value={stats.totalPatients || ''} onChange={e => setStats({ ...stats, totalPatients: e.target.value ? Number(e.target.value) : undefined })} placeholder="50000" />
              </div>
              <div>
                <Label>Total Doctors</Label>
                <Input type="number" value={stats.totalDoctors || ''} onChange={e => setStats({ ...stats, totalDoctors: e.target.value ? Number(e.target.value) : undefined })} placeholder="5" />
              </div>
              <div>
                <Label>Branches</Label>
                <Input type="number" value={stats.totalBranches || ''} onChange={e => setStats({ ...stats, totalBranches: e.target.value ? Number(e.target.value) : undefined })} placeholder="1" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
