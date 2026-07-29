'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ArrowRight, Bot, Stethoscope, CalendarDays, Phone, Wrench } from 'lucide-react'

interface Props {
  whatsappConnected: boolean
  doctorsAdded: boolean
  servicesConfigured: boolean
  hasSchedules: boolean
}

const STEPS = [
  { key: 'whatsapp', label: 'WhatsApp connect karein', desc: 'Apne clinic ka WhatsApp number connect karein', href: '/dashboard/clinic/whatsapp', icon: Phone, doneKey: 'whatsappConnected' as const },
  { key: 'doctors', label: 'Doctors add karein', desc: 'Doctors, unki speciality aur timings set karein', href: '/dashboard/clinic/doctors', icon: Stethoscope, doneKey: 'doctorsAdded' as const },
  { key: 'services', label: 'Services aur fees set karein', desc: 'Checkup fees aur available services configure karein', href: '/dashboard/clinic/services', icon: Wrench, doneKey: 'servicesConfigured' as const },
  { key: 'schedules', label: 'Schedules banaen', desc: 'Doctors ke weekly working hours set karein', href: '/dashboard/clinic/doctors', icon: CalendarDays, doneKey: 'hasSchedules' as const },
  { key: 'agent', label: 'AI Agent configure karein', desc: 'Agent ka naam, language aur tone set karein', href: '/dashboard/clinic/agent', icon: Bot, doneKey: null },
]

export function OnboardingChecklist({ whatsappConnected, doctorsAdded, servicesConfigured, hasSchedules }: Props) {
  const doneMap = { whatsappConnected, doctorsAdded, servicesConfigured, hasSchedules }
  const completedCount = STEPS.filter((s) => s.doneKey ? doneMap[s.doneKey] : true).length
  const allDone = completedCount >= STEPS.length - 1 // agent step is optional for "all done" -1

  if (allDone) return null

  return (
    <Card className="border-brand/30 bg-brand/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-brand" />
              Setup Checklist — {completedCount}/{STEPS.length} done
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Apne clinic ko fully operational banane ke liye ye steps complete karein</p>
          </div>
          <div className="h-2 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => {
            const isDone = step.doneKey ? doneMap[step.doneKey] : true
            const Icon = step.icon
            return (
              <Link key={step.key} href={step.href} className="group">
                <div className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all group-hover:border-brand/40 ${isDone ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-500/5' : 'border-muted-foreground/20 bg-background'}`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-medium ${isDone ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{step.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{step.desc}</p>
                  </div>
                  {!isDone && <ArrowRight className="w-3 h-3 text-muted-foreground mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
