'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  format?: (n: number) => string
}

/**
 * Animated number counter that counts up when scrolled into view.
 * Uses requestAnimationFrame + easing for a premium feel.
 */
export function AnimatedCounter({
  value,
  duration = 1200,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  format,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf: number
    const start = performance.now()
    const startVal = 0
    const endVal = value

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo — premium deceleration
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = startVal + (endVal - startVal) * eased
      setDisplay(current)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  const formatted = format
    ? format(display)
    : `${prefix}${display.toLocaleString('en-PK', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  )
}
