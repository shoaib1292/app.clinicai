'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number
  y?: number
  duration?: number
}

/**
 * Subtle fade-up-on-scroll wrapper using Framer Motion.
 * Animates once when scrolled into view. Safe to use as a client
 * boundary around server-rendered children.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  duration = 0.55,
  ...props
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
