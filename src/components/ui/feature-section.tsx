"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Smartphone,
  ListOrdered,
  Mic,
  Users,
  Activity,
  Wallet,
  BarChart3,
  Power,
} from "lucide-react";

const REDUCED_MOTION_CONDITIONS = "(prefers-reduced-motion: reduce)";
const TOUCH_CONDITIONS = "(pointer: coarse)";

const tasks = [
  {
    title: "Dual WhatsApp mode",
    subtitle: "QR + Meta API — keep your own number",
    icon: <Smartphone className="size-4" />,
  },
  {
    title: "Token + Time queues",
    subtitle: "Patients get both, automatically",
    icon: <ListOrdered className="size-4" />,
  },
  {
    title: "Voice + Text replies",
    subtitle: "Voice in, voice out — easy for elderly patients",
    icon: <Mic className="size-4" />,
  },
  {
    title: "Family memory",
    subtitle: "One number, every family member's records",
    icon: <Users className="size-4" />,
  },
  {
    title: "Live queue status",
    subtitle: "Ask how long the wait is — the AI replies in real time",
    icon: <Activity className="size-4" />,
  },
  {
    title: "Cash + Online payments",
    subtitle: "Cash-first model. Optional screenshot verification",
    icon: <Wallet className="size-4" />,
  },
  {
    title: "Analytics dashboard",
    subtitle: "No-shows, peak hours, revenue — all in clear graphs",
    icon: <BarChart3 className="size-4" />,
  },
  {
    title: "On/Off toggle",
    subtitle: "A day off or an emergency — switch it off in one click",
    icon: <Power className="size-4" />,
  },
];

export default function FeatureSection() {
  const [motionDisabled, setMotionDisabled] = React.useState(false)

  React.useEffect(() => {
    const mq = matchMedia(REDUCED_MOTION_CONDITIONS)
    setMotionDisabled(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMotionDisabled(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <section id="features" className="relative w-full py-20 px-4 bg-background text-foreground">
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 items-center gap-12">
        {/* LEFT SIDE - Task Loop with Vertical Bar */}
        <div className="relative w-full max-w-sm">
          <Card className="overflow-hidden bg-muted/30 dark:bg-muted/20 backdrop-blur-md shadow-xl rounded-lg">
            <CardContent className="relative h-[320px] p-0 overflow-hidden">
              {/* Scrollable Container */}
              <div className="relative h-full overflow-hidden">
                <motion.div
                  className="flex flex-col gap-2 absolute w-full"
                  animate={motionDisabled ? { y: "0%" } : { y: ["0%", "-50%"] }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: motionDisabled ? 0.01 : 14,
                    ease: "linear",
                  }}
                >
                  {[...tasks, ...tasks].map((task, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 relative"
                    >
                      {/* Icon + Content */}
                      <div className="flex items-center justify-between flex-1">
                        <div className="flex items-center gap-2">
                          <div className="bg-brand/10 flex items-center justify-center w-10 h-10 rounded-xl shadow-md">
                            <span className="text-brand">{task.icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.subtitle}</p>
                          </div>
                        </div>
                        {task.icon}
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Fade effect only inside card */}
                <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-background via-background/70 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE - Content */}
        <div className="space-y-6">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            AI Receptionist
          </Badge>
          <h3 className="text-lg sm:text-md lg:text-2xl font-normal text-gray-900 dark:text-white leading-relaxed">
            8 capabilities.{" "}
            <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base lg:text-2xl">Zero extra staff. The AI helps at every step of the patient journey — from the first booking to the final follow-up. WhatsApp, voice, payments, and analytics, all on one platform.</span>
          </h3>

          <div className="flex gap-3 flex-wrap">
            <Badge className="px-4 py-2 text-sm">WhatsApp Native</Badge>
            <Badge className="px-4 py-2 text-sm">AI-Powered</Badge>
            <Badge className="px-4 py-2 text-sm">Zero Training</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
