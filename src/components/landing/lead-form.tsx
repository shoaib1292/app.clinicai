'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FadeIn } from './fade-in'

const leadSchema = z.object({
  clinicName: z
    .string()
    .min(2, 'Clinic name zaroori hai (kam az kam 2 harf).'),
  adminName: z
    .string()
    .min(2, 'Aap ka naam zaroori hai (kam az kam 2 harf).'),
  whatsappNumber: z
    .string()
    .min(7, 'WhatsApp number zaroori hai.')
    .regex(
      /^(\+92|0)?3\d{2}[- ]?\d{7}$/,
      'Valid Pakistani number: +92 300 1234567 ya 03001234567'
    ),
  city: z.string().min(2, 'City zaroori hai (kam az kam 2 harf).'),
  monthlyAppointments: z.string().min(1, 'Ek option select karein.'),
})

type LeadFormValues = z.infer<typeof leadSchema>

const appointmentBuckets = [
  { value: 'lt-500', label: 'Less than 500' },
  { value: '500-2000', label: '500 - 2,000' },
  { value: '2000-5000', label: '2,000 - 5,000' },
  { value: 'gt-5000', label: 'More than 5,000' },
]

export function LeadFormSection() {
  return (
    <section
      id="lead-form"
      className="relative overflow-hidden bg-card/30 py-20 sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 size-72 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 md:grid-cols-2 md:items-center">
        <FadeIn>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            Get started
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Aaj hi shuru karein. 5 minute me live.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Free 14-day trial. No credit card. Hamari team 24 ghante me
            WhatsApp par rujoo karegi.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              'QR scan karein — 2 minute me live',
              'AI agent Urdu/English dono me jawab dega',
              'No setup fee, no monthly fee',
              'Cancel anytime — no questions asked',
            ].map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-foreground/85"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
                  <CheckCircle2 className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-brand/5 sm:p-8">
            <LeadFormCard />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function LeadFormCard() {
  const [submitting, setSubmitting] = React.useState(false)

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      clinicName: '',
      adminName: '',
      whatsappNumber: '',
      city: '',
      monthlyAppointments: '',
    },
  })

  async function onSubmit(values: LeadFormValues) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`)
      }
      toast.success('Shukriya! Aap ka free trial setup start ho gaya.', {
        description: 'Hum 24 ghante ke andar WhatsApp par rujoo karenge.',
      })
      form.reset()
    } catch {
      toast.error('Kuch masla hua. Dobara try karein.', {
        description: 'Ya humein hello@clinicai.par email karein.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="clinicName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clinic name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Al-Shifa Family Clinic"
                    autoComplete="organization"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="adminName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aap ka naam</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Dr. Ahmed"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="whatsappNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+92 300 1234567"
                    inputMode="tel"
                    autoComplete="tel-national"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Karachi"
                    autoComplete="address-level2"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="monthlyAppointments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly appointments (estimate)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select karein" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {appointmentBuckets.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Bhej rahe hain...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Free trial shuru karein
            </>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="size-3 text-brand" />
          14 din free · No credit card · Cancel anytime
        </p>
      </form>
    </Form>
  )
}
