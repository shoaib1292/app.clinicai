'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Calendar, ArrowRight, Sparkles, Bot, Smartphone, Mail } from 'lucide-react'

export default function SignupSuccessPage() {
  const searchParams = useSearchParams()
  const clinicId = searchParams.get('clinicId')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-lg">
        <CardContent className="py-10 px-8 text-center space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Mubarak! Aap ka clinic setup ho gaya.
            </h1>
            <p className="text-muted-foreground">
              ClinicAI ab aapke clinic ke liye ready hai. Agla step: WhatsApp connect karein.
            </p>
          </div>

          <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-brand shrink-0" />
              <div>
                <div className="font-semibold">Verify your email</div>
                <div className="text-sm text-muted-foreground">
                  We&apos;ve sent a verification email to your inbox. Please click the link to verify your email address.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-brand shrink-0" />
              <div>
                <div className="font-semibold">1,000 PKR free credits</div>
                <div className="text-sm text-muted-foreground">
                  Aapke wallet mein add kar diye gaye hain. Free use karein.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Smartphone className="size-5 text-brand shrink-0" />
              <div>
                <div className="font-semibold">WhatsApp connect karein</div>
                <div className="text-sm text-muted-foreground">
                  QR scan karein ya Meta API se apna number link karein. 2 minute me live.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-brand shrink-0" />
              <div>
                <div className="font-semibold">Onboarding meeting book karein</div>
                <div className="text-sm text-muted-foreground">
                  Hamari team aapko setup karne mein help karegi — doctors add, agent configure.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bot className="size-5 text-brand shrink-0" />
              <div>
                <div className="font-semibold">Uske baad, live!</div>
                <div className="text-sm text-muted-foreground">
                  AI receptionist patient ko jawab dena shuru kar dega.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" asChild>
              <Link href="/onboarding">
                <Sparkles className="size-4 mr-1" /> Complete Your Clinic Setup
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Set up your clinic details, add doctors & staff, configure services,<br />
              and connect WhatsApp — all in one guided flow.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={`/dashboard/clinic`}>
                Skip setup, go to dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
