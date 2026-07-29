"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { CheckCheck, Play, Send } from "lucide-react";

const INJECTED_STYLES = `
  @keyframes msgSlideIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
  @keyframes floatBadge {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  @keyframes phoneEnter {
    from { opacity: 0; transform: translateY(30px) scale(0.92); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .msg-anim {
    animation: msgSlideIn 0.45s ease-out both;
  }
  .dot-anim {
    animation: dotPulse 1.4s ease-in-out infinite;
  }
  .float-badge-anim {
    animation: floatBadge 3s ease-in-out infinite;
  }
  .phone-enter-anim {
    animation: phoneEnter 0.7s ease-out;
  }

  .iphone-bezel-simple {
    background-color: #111;
    box-shadow:
      inset 0 0 0 2px #52525B,
      inset 0 0 0 7px #000,
      0 25px 60px -10px rgba(0,0,0,0.5);
  }

  .wa-status-bar {
    background: #075E54;
  }
  :is(.dark) .wa-status-bar {
    background: #0B141A;
  }
  .wa-header {
    background: #075E54;
  }
  :is(.dark) .wa-header {
    background: #202C33;
  }
  .wa-chat-bg {
    background: #ECE5DD;
  }
  :is(.dark) .wa-chat-bg {
    background: #0B141A;
  }
  .wa-bubble-in {
    background: #FFFFFF;
    border-radius: 8px 8px 8px 2px;
    color: #111B21;
  }
  :is(.dark) .wa-bubble-in {
    background: #202C33;
    color: #E9EDEF;
  }
  .wa-bubble-out {
    background: #D9FDD3;
    color: #111B21;
    border-radius: 8px 8px 2px 8px;
  }
  :is(.dark) .wa-bubble-out {
    background: #005C4B;
    color: #E9EDEF;
  }
  .wa-input {
    background: #FFFFFF;
  }
  :is(.dark) .wa-input {
    background: #202C33;
  }

  .chat-sheen {
    background: linear-gradient(110deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%);
  }
`;

const CHAT_MESSAGES = [
  { from: "patient" as const, text: "Hi, I'd like to book an appointment", time: "10:24 AM" },
  { from: "agent" as const, text: "Hello! Would 10:30 AM tomorrow with Dr. Ahmed work for you?", time: "10:24 AM" },
  { from: "patient" as const, text: "Yes, that's perfect", time: "10:25 AM" },
  { from: "agent" as const, text: "You're all set. Token #4, 10:30 AM. The fee is PKR 1,250, payable at the clinic.", time: "10:25 AM" },
];

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  headline?: string;
  subheadline?: string;
  description?: string;
  className?: string;
}

export function CinematicHero({
  headline = "Your clinic's WhatsApp,",
  subheadline = "now an AI receptionist.",
  description = "Bookings, reminders, and follow-ups — around the clock, in Urdu or English, without hiring another receptionist. 500+ clinics across Pakistan already trust ClinicAI.",
  className,
  ...props
}: CinematicHeroProps) {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true)
    const timers: ReturnType<typeof setTimeout>[] = []
    CHAT_MESSAGES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleMessages(i + 1), 600 + i * 900))
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

  return (
    <div
      className={cn(
        "relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden bg-background",
        className
      )}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />

      {/* Background grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundSize: "60px 60px",
          backgroundImage:
            "linear-gradient(to right, color-mix(in srgb, var(--color-foreground) 4%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-foreground) 4%, transparent) 1px, transparent 1px)",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full content-container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text + CTA */}
          <div className="flex flex-col gap-6 text-center lg:text-left">
            {/* Logo */}
            <div className="flex items-center justify-center lg:justify-start">
              <img
                src={logoSrc}
                alt="ClinicAI"
                className="h-10 w-auto object-contain"
              />
            </div>

            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                {headline}
                <br />
                <span className="text-gradient-brand">{subheadline}</span>
              </h1>
            </div>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
              <a
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-foreground/10 active:scale-[0.98]"
              >
                Start free trial
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-8 py-3 text-sm font-medium transition-all hover:bg-muted hover:border-brand/30 active:scale-[0.98]"
              >
                <Play className="size-4" />
                Watch demo
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                24/7 active
              </span>
              <span>500+ clinics</span>
              <span>Free for clinics</span>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-end relative">
            <div className="phone-enter-anim relative w-[260px] h-[520px] rounded-[2.5rem] iphone-bezel-simple flex flex-col will-change-transform">
              {/* Hardware buttons */}
              <div className="absolute top-[110px] -left-[3px] w-[3px] h-[22px] bg-zinc-700 rounded-l-md" />
              <div className="absolute top-[150px] -left-[3px] w-[3px] h-[40px] bg-zinc-700 rounded-l-md" />
              <div className="absolute top-[210px] -left-[3px] w-[3px] h-[40px] bg-zinc-700 rounded-l-md" />
              <div className="absolute top-[160px] -right-[3px] w-[3px] h-[60px] bg-zinc-700 rounded-r-md" />

              {/* Screen */}
              <div className="absolute inset-[7px] bg-[#ECE5DD] dark:bg-[#0B141A] rounded-[2.2rem] overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] z-10 flex flex-col">
                <div className="absolute inset-0 chat-sheen z-40 pointer-events-none" />

                {/* Dynamic Island */}
                <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-50 flex items-center justify-end px-3">
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>

                {/* Status bar */}
                <div className="wa-status-bar flex items-center justify-between px-5 pt-9 pb-1.5 text-white text-[9px] font-medium">
                  <span>10:25 AM</span>
                  <div className="flex items-center gap-1">
                    <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z" />
                    </svg>
                    <svg className="size-2.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z" />
                    </svg>
                  </div>
                </div>

                {/* Chat header */}
                <div className="wa-header flex items-center gap-2.5 px-3.5 py-1.5 text-white">
                  <div className="size-7 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">
                    S
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold leading-tight">ClinicAI Assistant</div>
                    <div className="text-[8px] text-white/70">online</div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 wa-chat-bg px-3 py-3 overflow-hidden flex flex-col justify-end gap-2">
                  <div className="space-y-2">
                    {CHAT_MESSAGES.map((msg, i) => {
                      if (i >= visibleMessages) return null
                      return (
                        <div
                          key={i}
                          className={`msg-anim flex ${msg.from === "agent" ? "justify-end" : "justify-start"}`}
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <div className={`max-w-[85%] px-2.5 py-1.5 text-[12px] leading-snug ${msg.from === "agent" ? "wa-bubble-out" : "wa-bubble-in"}`}>
                            <p className={/[اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئ]/.test(msg.text) ? "font-urdu" : ""} dir="auto">
                              {msg.text}
                            </p>
                            <div className={`flex items-center gap-1 mt-0.5 ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                              <span className="text-[8px] opacity-50">{msg.time}</span>
                              {msg.from === "agent" && <CheckCheck className="size-2.5 text-green-500" />}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Typing indicator */}
                  {visibleMessages > 0 && visibleMessages < CHAT_MESSAGES.length && (
                    <div className="flex justify-start">
                      <div className="wa-bubble-in flex items-center gap-1 px-3 py-2 rounded-full">
                        <span className="size-1.5 rounded-full bg-gray-400 dot-anim" style={{ animationDelay: "0ms" }} />
                        <span className="size-1.5 rounded-full bg-gray-400 dot-anim" style={{ animationDelay: "120ms" }} />
                        <span className="size-1.5 rounded-full bg-gray-400 dot-anim" style={{ animationDelay: "240ms" }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <div className="wa-header flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 wa-input rounded-full px-3 py-1 text-[11px] text-gray-400 dark:text-gray-400">
                    Type a message...
                  </div>
                  <Send className="size-4 text-white/60" />
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="float-badge-anim absolute -top-2 -left-3 lg:-left-6 bg-background/80 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-lg" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-1.5">
                <span className="text-base">🤖</span>
                <div>
                  <p className="text-[10px] font-bold text-foreground">AI Receptionist</p>
                  <p className="text-[8px] text-muted-foreground">24/7 active</p>
                </div>
              </div>
            </div>
            <div className="float-badge-anim absolute -bottom-1 -right-3 lg:-right-6 bg-background/80 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-lg" style={{ animationDelay: "0.8s" }}>
              <div className="flex items-center gap-1.5">
                <span className="text-base">📱</span>
                <div>
                  <p className="text-[10px] font-bold text-foreground">WhatsApp Native</p>
                  <p className="text-[8px] text-muted-foreground">Your existing number</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
