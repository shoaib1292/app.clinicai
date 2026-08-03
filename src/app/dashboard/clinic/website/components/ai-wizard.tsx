'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, Building2, MapPin, Stethoscope, Clock, RefreshCw } from 'lucide-react'

const GENERATION_STEPS = [
  { key: 'analyze', label: 'Analyzing clinic type...' },
  { key: 'hero', label: 'Generating hero copy...' },
  { key: 'data', label: 'Fetching doctors & services...' },
  { key: 'validate', label: 'Validating output...' },
  { key: 'done', label: 'Done!' },
]

interface WizardData {
  clinicName: string
  city: string
  clinicType: string
  specialty: string
  services: string
  tone: string
  aboutExtra: string
}

const CLINIC_TYPES = [
  { value: 'general', label: 'General Clinic', emoji: '🏥' },
  { value: 'dental', label: 'Dental Clinic', emoji: '🦷' },
  { value: 'skin', label: 'Skin / Dermatology', emoji: '✨' },
  { value: 'cardiac', label: 'Cardiac / Heart', emoji: '❤️' },
  { value: 'gynae', label: 'Gynecology', emoji: '👶' },
  { value: 'pediatric', label: 'Pediatric / Child', emoji: '🧒' },
  { value: 'multi', label: 'Multi-Specialty', emoji: '🏨' },
  { value: 'other', label: 'Other', emoji: '⚕️' },
]

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Trustworthy and formal' },
  { value: 'friendly', label: 'Friendly & Warm', desc: 'Welcoming and approachable' },
  { value: 'modern', label: 'Modern & Bold', desc: 'Clean and contemporary' },
]

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'basic', title: 'Basic Info', icon: Building2 },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'services', title: 'Services & Style', icon: Stethoscope },
  { id: 'generate', title: 'Generate', icon: Sparkles },
]

export function AIWizard({ clinicId, slug, onComplete }: { clinicId: string; slug: string; onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(-1)
  const [genTime, setGenTime] = useState<string>('0.0')
  const [generatedBlocks, setGeneratedBlocks] = useState<string[]>([])
  const [data, setData] = useState<WizardData>({
    clinicName: '',
    city: 'Karachi',
    clinicType: 'multi',
    specialty: '',
    services: '',
    tone: 'professional',
    aboutExtra: '',
  })

  function update(field: keyof WizardData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function back() { setStep(s => Math.max(s - 1, 0)) }

  async function generate() {
    setGenerating(true)
    setGenStep(-1)
    setGeneratedBlocks([])
    const startTime = Date.now()

    const progressTimer = setInterval(() => {
      setGenStep(s => {
        if (s >= GENERATION_STEPS.length - 2) return s
        return s + 1
      })
    }, 1200)

    try {
      const res = await fetch('/api/website/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, clinicId }),
      })
      clearInterval(progressTimer)
      setGenStep(GENERATION_STEPS.length - 2)
      const json = await res.json()
      if (json.ok) {
        setGenTime(((Date.now() - startTime) / 1000).toFixed(1))
        setGenStep(GENERATION_STEPS.length - 1)
        if (json.data) {
          const blocks: string[] = []
          if (json.data.hero) blocks.push('Hero Section')
          if (json.data.about) blocks.push('About')
          if (json.data.faqs) blocks.push('FAQs')
          if (json.data.seo) blocks.push('SEO')
          setGeneratedBlocks(blocks)
        }
        toast.success(`Website content generated in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`)
      } else {
        toast.error(json.error || 'Generation failed. Try again.')
      }
    } catch {
      toast.error('Failed to generate. Check your connection.')
      clearInterval(progressTimer)
    } finally {
      setGenerating(false)
    }
  }

  async function regenerate() {
    setGeneratedBlocks([])
    await generate()
  }

  const StepIcon = STEPS[step].icon

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? 'text-white' : i === step ? 'text-white ring-2 ring-offset-2' : 'text-muted-foreground bg-muted'
            }`}
              style={i <= step ? { background: 'var(--website-primary, #0891b2)' } : {}}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? '' : 'bg-muted'}`}
              style={i < step ? { background: 'var(--website-primary, #0891b2)' } : {}} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StepIcon className="w-5 h-5" />
            {STEPS[step].title}
          </CardTitle>
          <CardDescription>
            {step === 0 && "Let's build your clinic's website with AI. Answer a few questions."}
            {step === 1 && "Tell us about your clinic."}
            {step === 2 && "Where are you located?"}
            {step === 3 && "What services do you offer and what style do you prefer?"}
            {step === 4 && "Ready to generate! Review your info and let AI do the magic."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--website-primary, #0891b2), var(--website-primary-light, #0891b21a))' }}>
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold">AI Website Builder</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Answer 4 quick questions and AI will generate your complete clinic website — hero, about, services, FAQs, and SEO.
              </p>
              <Button onClick={next} size="lg" className="gap-2 mt-4">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Clinic Name</Label>
                <Input value={data.clinicName} onChange={e => update('clinicName', e.target.value)} placeholder="e.g., Al-Shifa Family Clinic" />
              </div>
              <div>
                <Label>Specialty / Tagline</Label>
                <Input value={data.specialty} onChange={e => update('specialty', e.target.value)} placeholder="e.g., Your Family's Health, Our Priority" />
              </div>
              <div>
                <Label>Clinic Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CLINIC_TYPES.map(t => (
                    <button key={t.value}
                      onClick={() => update('clinicType', t.value)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                        data.clinicType === t.value ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/50'
                      }`}>
                      <span className="text-lg">{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>City</Label>
                <Input value={data.city} onChange={e => update('city', e.target.value)} placeholder="Karachi, Lahore, Islamabad..." />
              </div>
              <div>
                <Label>Any special info about your clinic? (optional)</Label>
                <Textarea
                  value={data.aboutExtra}
                  onChange={e => update('aboutExtra', e.target.value)}
                  placeholder="e.g., We've been serving the community for 20 years. We specialize in family medicine and preventive care..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Services & Tone */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Services (comma separated)</Label>
                <Textarea
                  value={data.services}
                  onChange={e => update('services', e.target.value)}
                  placeholder="e.g., General Consultation, Dental Checkup, Skin Treatment, Cardiology, Pediatrics"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for AI to suggest based on clinic type.</p>
              </div>
              <div>
                <Label>Website Tone</Label>
                <div className="grid gap-2 mt-2">
                  {TONES.map(t => (
                    <button key={t.value}
                      onClick={() => update('tone', t.value)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm text-left transition-all ${
                        data.tone === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {step === 4 && (
            <div className="space-y-4">
              {!generating && genStep < 0 && (
                <>
                  <div className="p-4 rounded-lg bg-muted space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-medium">{data.clinicName || '(Will use existing)'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">City:</span> <span className="font-medium">{data.city}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span className="font-medium">{CLINIC_TYPES.find(t => t.value === data.clinicType)?.label}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tone:</span> <span className="font-medium">{TONES.find(t => t.value === data.tone)?.label}</span></div>
                    {data.services && <div className="flex justify-between"><span className="text-muted-foreground">Services:</span> <span className="font-medium truncate max-w-[200px]">{data.services}</span></div>}
                  </div>

                  <Button onClick={generate} disabled={generating} size="lg" className="w-full gap-2">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generating ? 'Generating...' : '✨ Generate My Website'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    AI will generate hero, about, FAQs, and SEO using real LLM.
                  </p>
                </>
              )}

              {generating && (
                <div className="space-y-3 py-6">
                  {GENERATION_STEPS.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                        i < genStep ? 'text-white' : i === genStep ? 'text-white animate-pulse' : 'bg-muted text-muted-foreground'
                      }`} style={i <= genStep ? { background: 'var(--website-primary, #0891b2)' } : {}}>
                        {i < genStep ? <Check className="w-3 h-3" /> : i === genStep ? <Loader2 className="w-3 h-3 animate-spin" /> : i + 1}
                      </div>
                      <span className={`text-sm ${i <= genStep ? 'font-medium' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!generating && genStep >= 0 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Generated in {genTime}s
                      </span>
                    </div>
                    {generatedBlocks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Generated sections:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedBlocks.map(b => (
                            <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={regenerate} variant="outline" className="gap-2 flex-1">
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </Button>
                    <Button onClick={() => { onComplete() }} className="gap-2 flex-1">
                      <Check className="w-4 h-4" /> View & Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          {step > 0 && step < 4 && (
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={back} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={next} className="gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
