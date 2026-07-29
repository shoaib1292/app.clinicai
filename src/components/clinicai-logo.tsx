'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ClinicAILogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
  iconClassName?: string
}

const sizeMap = {
  sm: { icon: 'h-8', dim: 120 },
  md: { icon: 'h-9', dim: 136 },
  lg: { icon: 'h-10', dim: 152 },
}

export function ClinicAILogo({
  size = 'md',
  href = '/',
  className,
  iconClassName,
}: ClinicAILogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const s = sizeMap[size]
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/logo-dark.png' : '/logo-light.png'

  const content = (
    <img
      src={logoSrc}
      alt="ClinicAI"
      className={cn(s.icon, 'w-auto shrink-0 object-contain', iconClassName)}
      height={s.dim}
    />
  )

  if (!href) {
    return <div className={cn('flex items-center', className)}>{content}</div>
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md',
        className
      )}
      aria-label="ClinicAI home"
    >
      {content}
    </Link>
  )
}
