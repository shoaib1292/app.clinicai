'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link2, Copy, Check, ExternalLink, QrCode, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'

interface Clinic { id: string; name: string; slug: string }
interface Doctor { id: string; name: string; speciality: string }
interface Service { id: string; name: string; baseFee: number; durationMin: number; doctor: { name: string } | null }

export function BookingLinksClient({ clinic, doctors, services }: { clinic: Clinic; doctors: Doctor[]; services: Service[] }) {
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [selectedService, setSelectedService] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  // Generate a signed short-lived token (simulated — in production this would be a JWT)
  const baseUrl = mounted ? window.location.origin : 'https://app.clinicsai.pk'
  const token = btoa(`${clinic.id}:${selectedDoctor}:${selectedService}`).replace(/=/g, '')
  const link = selectedDoctor || selectedService ? `${baseUrl}/b/${token}` : ''

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Link2 className="w-6 h-6 text-brand" />Shareable Booking Links</h1>
        <p className="text-muted-foreground">Generate shareable links for patients to book without WhatsApp — routes through the same booking engine</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Link generator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Link</CardTitle>
            <CardDescription>Select a doctor and/or service to create a direct booking link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Doctor (optional)</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger><SelectValue placeholder="Any doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.speciality})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service (optional)</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger><SelectValue placeholder="Any service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — PKR {s.baseFee + 50}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {link && (
              <div className="space-y-2 pt-2">
                <Label>Your booking link</Label>
                <div className="flex gap-2">
                  <Input value={link} readOnly className="font-mono text-xs" />
                  <Button size="icon" onClick={copyLink} aria-label="Copy link">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This link is valid for 24 hours. Patients can pick a slot and book without WhatsApp.</p>
              </div>
            )}

            {!link && (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                Select a doctor or service to generate a link
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How Booking Links Work</CardTitle>
            <CardDescription>Founder doc §42 — shareable link booking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div>
                <div className="font-medium">Generate & share</div>
                <div className="text-muted-foreground">Copy the link and share via WhatsApp, SMS, email, or your clinic's website.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div>
                <div className="font-medium">Patient picks a slot</div>
                <div className="text-muted-foreground">Patient opens the link, sees available slots, enters name + phone, and books.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <div>
                <div className="font-medium">AI agent follows up</div>
                <div className="text-muted-foreground">If the patient's number is known, the AI agent follows up on WhatsApp with reminders.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold shrink-0">4</div>
              <div>
                <div className="font-medium">Platform fee applies</div>
                <div className="text-muted-foreground">PKR 50 platform fee is charged on every appointment — regardless of channel (WhatsApp, manual, or link).</div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground mb-2">Abuse protection:</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Per-link rate limit: 50 bookings/hour</li>
                <li>• CAPTCHA after threshold</li>
                <li>• Abuse flag to platform admin</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick doctor links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4" />Quick Doctor Links</CardTitle>
          <CardDescription>One-click links for each doctor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {doctors.map((d) => {
              const docToken = btoa(`${clinic.id}:${d.id}:`).replace(/=/g, '')
              const docLink = `${baseUrl}/b/${docToken}`
              return (
                <div key={d.id} className="p-3 rounded-md border hover:border-brand transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.speciality}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">Doctor</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { navigator.clipboard.writeText(docLink); toast.success(`${d.name} link copied`) }}>
                      <Copy className="w-3 h-3 mr-1" />Copy
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" asChild>
                      <a href={docLink} target="_blank" rel="noreferrer"><ExternalLink className="w-3 h-3" /></a>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
