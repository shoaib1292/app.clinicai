'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { getImageUrl } from '@/lib/image-url'

interface WebsiteHeaderProps {
  clinic: {
    slug: string
    name: string
    logoUrl: string | null
    logoKey?: string | null
  }
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Doctors', href: '/doctors' },
  { label: 'Contact', href: '/contact' },
]

export function WebsiteHeader({ clinic }: WebsiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const logoSrc = clinic.logoKey ? getImageUrl(clinic.logoKey, 100) : clinic.logoUrl

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        background: 'color-mix(in srgb, var(--website-surface) 85%, transparent)',
        borderColor: 'var(--website-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + Name */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--website-text)' }}
        >
          <Avatar className="w-8 h-8">
            {logoSrc ? (
              <AvatarImage src={logoSrc} alt={clinic.name} />
            ) : null}
            <AvatarFallback
              className="text-sm font-bold text-white"
              style={{ background: 'var(--website-primary)' }}>
              {clinic.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold truncate max-w-[160px]">{clinic.name}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              className="text-sm font-medium"
              style={{ color: 'var(--website-text-muted)' }}
              asChild
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          <div className="w-2" />
          <Button
            size="sm"
            className="text-white font-semibold hover:opacity-90 transition-all hover:scale-105"
            style={{ background: 'var(--website-primary)', borderRadius: 'var(--website-radius)' }}
            asChild
          >
            <Link href={`/p/${clinic.slug}`}>Patient Portal</Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" style={{ color: 'var(--website-text)' }}>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] pt-12">
              <nav className="flex flex-col gap-2">
                {navLinks.map(link => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start text-base font-medium w-full"
                    style={{ color: 'var(--website-text)' }}
                    onClick={() => setOpen(false)}
                    asChild
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                <div className="pt-2">
                  <Button
                    className="w-full text-white font-semibold"
                    style={{ background: 'var(--website-primary)' }}
                    onClick={() => setOpen(false)}
                    asChild
                  >
                    <Link href={`/p/${clinic.slug}`}>Patient Portal</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
