'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Github,
  Linkedin,
  Twitter,
  Mail,
  MessageCircle,
  MapPin,
} from 'lucide-react'

type FooterLink = { label: string; href: string }

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Demo', href: '#demo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

export function Footer() {
  const [lang, setLang] = React.useState<'EN' | 'UR'>('EN')

  return (
    <footer id="contact" className="mt-auto border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="ClinicAI home"
          >
            <img
              src="/favicon.svg"
              alt="ClinicAI logo"
              className="size-8"
              width={32}
              height={32}
            />
            <span className="text-lg font-bold tracking-tight">ClinicAI</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            AI receptionist for Pakistani clinics. WhatsApp pe booking,
            reminders, follow-ups — 24/7, Urdu/English.
          </p>

          <div className="mt-5 space-y-2 text-sm">
            <a
              href="mailto:hello@clinicai.pk"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4 text-brand" />
              hello@clinicai.pk
            </a>
            <a
              href="https://wa.me/923001234567"
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4 text-brand" />
              +92 300 1234567
            </a>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 text-brand" />
              F-8 Markaz, Islamabad, Pakistan
            </p>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-foreground">
              {col.title}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 ClinicAI. Made in Pakistan.
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Twitter / X"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Linkedin className="size-4" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="size-4" />
              </a>
            </div>

            <div
              className="flex items-center rounded-full border border-border p-0.5 text-xs font-medium"
              role="group"
              aria-label="Language toggle"
            >
              <button
                type="button"
                onClick={() => setLang('EN')}
                className={`rounded-full px-2.5 py-0.5 transition-colors ${
                  lang === 'EN'
                    ? 'bg-brand text-brand-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={lang === 'EN'}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('UR')}
                className={`urdu rounded-full px-2.5 py-0.5 text-[13px] transition-colors ${
                  lang === 'UR'
                    ? 'bg-brand text-brand-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={lang === 'UR'}
              >
                اردو
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
