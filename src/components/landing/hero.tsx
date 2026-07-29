'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  PlayCircle,
  ShieldCheck,
  BadgeCheck,
  Activity,
  CheckCheck,
  Camera,
  Mic,
  Phone,
  Plus,
  Send,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type ChatMessage = {
  from: 'patient' | 'agent'
  text: string
  time: string
  urdu?: boolean
}

const messages: ChatMessage[] = [
  {
    from: 'patient',
    text: 'Asalamualaikum, appointment lena hai',
    time: '10:24 AM',
    urdu: true,
  },
  {
    from: 'agent',
    text: 'Walaikum assalam! Ahmed bhai. Dr. Ahmed General ke saath kal 10:30 AM theek rahega?',
    time: '10:24 AM',
  },
  { from: 'patient', text: 'Haan', time: '10:25 AM', urdu: true },
  {
    from: 'agent',
    text: 'Confirm. Token 4, ~10:30 AM. Fees PKR 1250 (doctor 1200 + platform 50). Clinic me dena hoga.',
    time: '10:25 AM',
  },
]

export function Hero() {
  return (
    <section className="hero-gradient relative overflow-hidden">
      {/* Decorative blurred blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 size-72 rounded-full bg-brand/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 size-80 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft/60 px-3 py-1 text-xs font-medium text-brand">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" />
            WhatsApp-first AI receptionist
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-[3.25rem]">
            Your clinic&apos;s WhatsApp —
            <br />
            <span className="text-gradient-brand">
              now an AI receptionist.
            </span>
          </h1>

          <p
            className="urdu mt-4 text-2xl font-medium text-foreground/80 md:text-3xl"
            dir="rtl"
            lang="ur"
          >
            Apne clinic ka WhatsApp — AI receptionist ban jaaye.
          </p>

          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Booking, reminders, follow-ups — 24/7, Urdu/English, bina kisi
            extra staff ke.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild className="h-11">
              <a href="#lead-form">
                Clinic ke liye — Free trial shuru karein
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11">
              <a href="#demo">
                <PlayCircle className="size-4" />
                Demo dekhein
              </a>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-brand" /> Data encrypted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-4 text-brand" /> WhatsApp-verified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-4 text-brand" /> 99.9% uptime
            </span>
          </div>
        </motion.div>

        {/* Right: WhatsApp chat mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.7,
            delay: 0.15,
            ease: [0.21, 0.47, 0.32, 0.98],
          }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-brand/10">
            {/* Phone status bar */}
            <div className="flex items-center justify-between bg-foreground/95 px-5 py-2 text-[10px] font-medium text-background">
              <span>10:25 AM</span>
              <div className="flex items-center gap-1.5">
                <span aria-hidden>•••</span>
                <span aria-hidden>WiFi</span>
                <span aria-hidden>100%</span>
              </div>
            </div>

            {/* Chat header (brand gradient) */}
            <div className="brand-gradient flex items-center gap-3 px-4 py-3 text-white">
              <div
                className="flex size-10 items-center justify-center rounded-full bg-white/25 text-sm font-bold backdrop-blur"
                aria-hidden
              >
                S
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Sana · ClinicAI</div>
                <div className="text-[10px] text-white/85">
                  online · typing replies instantly
                </div>
              </div>
              <Video className="size-4 text-white/85" aria-hidden />
              <Phone className="size-4 text-white/85" aria-hidden />
            </div>

            {/* Chat body */}
            <div className="space-y-3 bg-[#ECE5DD]/60 px-4 py-5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.from === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 shadow-sm ${
                      m.from === 'agent' ? 'chat-bubble-out' : 'chat-bubble-in'
                    }`}
                  >
                    <p
                      className={`${
                        m.urdu
                          ? 'urdu text-[15px] leading-relaxed'
                          : 'text-[13px] leading-snug'
                      }`}
                      dir={m.urdu ? 'rtl' : 'auto'}
                    >
                      {m.text}
                    </p>
                    <div
                      className={`mt-1 flex items-center gap-1 text-[9px] ${
                        m.from === 'agent'
                          ? 'justify-end text-foreground/55'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span>{m.time}</span>
                      {m.from === 'agent' && (
                        <CheckCheck className="size-3 text-brand" aria-label="Read" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              <div className="flex justify-start">
                <div className="chat-bubble-in flex items-center gap-1 px-3 py-2.5">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
                </div>
              </div>
            </div>

            {/* Chat input bar (decorative) */}
            <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-2.5">
              <Plus className="size-5 text-muted-foreground" aria-hidden />
              <div
                className="flex-1 rounded-full bg-muted px-3 py-1.5 text-[11px] text-muted-foreground"
                aria-hidden
              >
                Type a message
              </div>
              <Camera className="size-5 text-muted-foreground" aria-hidden />
              <Mic className="size-5 text-brand" aria-hidden />
              <Send className="size-5 text-muted-foreground" aria-hidden />
            </div>
          </div>

          {/* Glow halo */}
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-[3rem] bg-brand/10 blur-3xl"
          />
        </motion.div>
      </div>
    </section>
  )
}
