'use client'

import { useState } from 'react'
import {
  Activity, CheckCircle, Microscope, ArrowRight,
  Heart, Thermometer, TrendingUp, Shield,
  Moon, Sun, Zap, Sparkles, Brain, Dna,
  Eye, Droplets, Star, Leaf, Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fontVariables } from './theme-fonts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThemeVariant {
  container: string
  card: string
  cardHover: string
  textPrimary: string
  textSecondary: string
  accent: string
  accentText: string
  badge: string
  badgeText: string
  iconColor: string
  border: string
}

interface ThemeConfig {
  name: string
  fontFamily: string
  light: ThemeVariant
  dark: ThemeVariant
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const th = (theme: ThemeConfig, isDark: boolean) => (isDark ? theme.dark : theme.light)

// ---------------------------------------------------------------------------
// 10 Original Themes
// ---------------------------------------------------------------------------

const originalThemes: ThemeConfig[] = [
  {
    name: 'Linear Minimal', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-white', card: 'bg-white', cardHover: 'hover:border-blue-500',
      textPrimary: 'text-black', textSecondary: 'text-neutral-500', accent: 'bg-blue-600',
      accentText: 'text-white', badge: 'bg-blue-50', badgeText: 'text-blue-700',
      iconColor: 'text-blue-600', border: 'border-neutral-200',
    },
    dark: {
      container: 'bg-gray-950', card: 'bg-gray-900', cardHover: 'hover:border-blue-400',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400', accent: 'bg-blue-500',
      accentText: 'text-white', badge: 'bg-blue-950/60', badgeText: 'text-blue-300',
      iconColor: 'text-blue-400', border: 'border-gray-800',
    },
  },
  {
    name: 'Mayo Clinical', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-[#0A1628]', card: 'bg-white', cardHover: 'hover:border-blue-400',
      textPrimary: 'text-gray-900', textSecondary: 'text-slate-500', accent: 'bg-[#1A5F7A]',
      accentText: 'text-white', badge: 'bg-blue-50', badgeText: 'text-[#1A5F7A]',
      iconColor: 'text-[#1A5F7A]', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-black', card: 'bg-[#0a1628]', cardHover: 'hover:border-blue-400',
      textPrimary: 'text-gray-100', textSecondary: 'text-slate-400', accent: 'bg-[#1A5F7A]',
      accentText: 'text-white', badge: 'bg-blue-950/40', badgeText: 'text-blue-300',
      iconColor: 'text-blue-400', border: 'border-gray-800',
    },
  },
  {
    name: 'Nordic Hospital', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-[#E8EDF2]', card: 'bg-white', cardHover: 'hover:border-sky-300',
      textPrimary: 'text-gray-800', textSecondary: 'text-gray-500', accent: 'bg-[#2C3E50]',
      accentText: 'text-white', badge: 'bg-sky-50', badgeText: 'text-[#2C3E50]',
      iconColor: 'text-[#4A6FA5]', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-[#1a1f26]', card: 'bg-[#252b33]', cardHover: 'hover:border-sky-400',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400', accent: 'bg-[#3d5068]',
      accentText: 'text-white', badge: 'bg-sky-950/40', badgeText: 'text-sky-300',
      iconColor: 'text-sky-400', border: 'border-gray-700',
    },
  },
  {
    name: 'Bento Obsidian', fontFamily: 'var(--font-space-grotesk)',
    light: {
      container: 'bg-[#f5f5f5]', card: 'bg-white', cardHover: 'hover:border-emerald-400',
      textPrimary: 'text-gray-900', textSecondary: 'text-gray-500', accent: 'bg-emerald-600',
      accentText: 'text-white', badge: 'bg-emerald-100', badgeText: 'text-emerald-700',
      iconColor: 'text-emerald-600', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-[#121212]', card: 'bg-[#1C1C1E]', cardHover: 'hover:border-emerald-500',
      textPrimary: 'text-white', textSecondary: 'text-gray-400', accent: 'bg-emerald-600',
      accentText: 'text-white', badge: 'bg-emerald-900/50', badgeText: 'text-emerald-300',
      iconColor: 'text-emerald-400', border: 'border-neutral-800',
    },
  },
  {
    name: 'Swiss Medical', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-[#F2F2F2]', card: 'bg-white', cardHover: 'hover:border-red-400',
      textPrimary: 'text-gray-900', textSecondary: 'text-gray-500', accent: 'bg-[#C62828]',
      accentText: 'text-white', badge: 'bg-red-50', badgeText: 'text-[#C62828]',
      iconColor: 'text-[#C62828]', border: 'border-gray-300',
    },
    dark: {
      container: 'bg-[#1a1a1a]', card: 'bg-[#252525]', cardHover: 'hover:border-red-400',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400', accent: 'bg-[#C62828]',
      accentText: 'text-white', badge: 'bg-red-950/40', badgeText: 'text-red-300',
      iconColor: 'text-red-400', border: 'border-gray-700',
    },
  },
  {
    name: 'Sage & Trust', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-[#F0F5EF]', card: 'bg-[#FAFCF9]', cardHover: 'hover:border-green-400',
      textPrimary: 'text-[#1B3B2B]', textSecondary: 'text-[#5C7A64]', accent: 'bg-[#2D5A3B]',
      accentText: 'text-white', badge: 'bg-green-100', badgeText: 'text-[#2D5A3B]',
      iconColor: 'text-[#3A7D4D]', border: 'border-green-100',
    },
    dark: {
      container: 'bg-[#0f1a12]', card: 'bg-[#1a2a1f]', cardHover: 'hover:border-green-400',
      textPrimary: 'text-green-50', textSecondary: 'text-green-300/70', accent: 'bg-[#3a7d4d]',
      accentText: 'text-white', badge: 'bg-green-950/50', badgeText: 'text-green-300',
      iconColor: 'text-green-400', border: 'border-green-900',
    },
  },
  {
    name: 'Tech Corporate', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-slate-50', card: 'bg-white', cardHover: 'hover:border-slate-400',
      textPrimary: 'text-slate-900', textSecondary: 'text-slate-500', accent: 'bg-slate-800',
      accentText: 'text-white', badge: 'bg-slate-100', badgeText: 'text-slate-700',
      iconColor: 'text-slate-700', border: 'border-slate-200',
    },
    dark: {
      container: 'bg-slate-900', card: 'bg-slate-800', cardHover: 'hover:border-slate-400',
      textPrimary: 'text-slate-100', textSecondary: 'text-slate-400', accent: 'bg-slate-600',
      accentText: 'text-white', badge: 'bg-slate-700', badgeText: 'text-slate-200',
      iconColor: 'text-slate-300', border: 'border-slate-600',
    },
  },
  {
    name: 'Teal Premium', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-white', card: 'bg-white', cardHover: 'hover:border-teal-400',
      textPrimary: 'text-slate-900', textSecondary: 'text-slate-500', accent: 'bg-teal-700',
      accentText: 'text-white', badge: 'bg-teal-50', badgeText: 'text-teal-700',
      iconColor: 'text-teal-600', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-gray-950', card: 'bg-gray-900', cardHover: 'hover:border-teal-400',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400', accent: 'bg-teal-600',
      accentText: 'text-white', badge: 'bg-teal-950/40', badgeText: 'text-teal-300',
      iconColor: 'text-teal-400', border: 'border-gray-800',
    },
  },
  {
    name: 'Midnight Professional', fontFamily: 'var(--font-space-grotesk)',
    light: {
      container: 'bg-[#f0f2f5]', card: 'bg-white', cardHover: 'hover:border-indigo-400',
      textPrimary: 'text-gray-900', textSecondary: 'text-gray-500', accent: 'bg-indigo-600',
      accentText: 'text-white', badge: 'bg-indigo-100', badgeText: 'text-indigo-700',
      iconColor: 'text-indigo-600', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-[#0D1117]', card: 'bg-[#161B22]', cardHover: 'hover:border-indigo-400',
      textPrimary: 'text-gray-100', textSecondary: 'text-[#B0B8C8]', accent: 'bg-indigo-600',
      accentText: 'text-white', badge: 'bg-indigo-900/40', badgeText: 'text-indigo-300',
      iconColor: 'text-indigo-400', border: 'border-[#30363D]',
    },
  },
  {
    name: 'Alabaster Luxury', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#F5F0EB]', card: 'bg-white', cardHover: 'hover:border-amber-300',
      textPrimary: 'text-[#3C2415]', textSecondary: 'text-[#8B7355]', accent: 'bg-[#5C3D2E]',
      accentText: 'text-white', badge: 'bg-amber-50', badgeText: 'text-[#5C3D2E]',
      iconColor: 'text-[#8B6914]', border: 'border-amber-200',
    },
    dark: {
      container: 'bg-[#1a1613]', card: 'bg-[#2a2420]', cardHover: 'hover:border-amber-400',
      textPrimary: 'text-amber-50', textSecondary: 'text-amber-200/60', accent: 'bg-[#5C3D2E]',
      accentText: 'text-white', badge: 'bg-amber-950/40', badgeText: 'text-amber-300',
      iconColor: 'text-amber-400', border: 'border-amber-900/60',
    },
  },
]

// ---------------------------------------------------------------------------
// 10 Premium Themes (Set 1) — with font pairings
// ---------------------------------------------------------------------------

const premiumThemesSet1: ThemeConfig[] = [
  {
    name: 'Glassmorphic Aether', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-gradient-to-br from-blue-50 via-white to-purple-50',
      card: 'bg-white/70 backdrop-blur-xl',
      cardHover: 'hover:border-white/80',
      textPrimary: 'text-gray-900', textSecondary: 'text-gray-500',
      accent: 'bg-gradient-to-r from-blue-500 to-purple-600', accentText: 'text-white',
      badge: 'bg-white/50 backdrop-blur-md', badgeText: 'text-purple-700',
      iconColor: 'text-purple-500', border: 'border-white/40',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-900 via-indigo-950/40 to-gray-950',
      card: 'bg-gray-800/40 backdrop-blur-xl',
      cardHover: 'hover:border-white/20',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400',
      accent: 'bg-gradient-to-r from-blue-500 to-purple-500', accentText: 'text-white',
      badge: 'bg-gray-700/50 backdrop-blur-md', badgeText: 'text-purple-300',
      iconColor: 'text-purple-400', border: 'border-white/10',
    },
  },
  {
    name: 'Clay Luxe', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#f0e6d3]',
      card: 'bg-[#e8dcc8] shadow-[8px_8px_16px_#d4c8b4,_-8px_-8px_16px_#fcf0dc]',
      cardHover: 'hover:border-[#c4a882]',
      textPrimary: 'text-[#3d2b1f]', textSecondary: 'text-[#8b7355]',
      accent: 'bg-[#8b6914]', accentText: 'text-white',
      badge: 'bg-[#d4c4a8]/70', badgeText: 'text-[#5c3d2e]',
      iconColor: 'text-[#8b6914]', border: 'border-[#d4c4a8]',
    },
    dark: {
      container: 'bg-[#1e1814]',
      card: 'bg-[#2a221b] shadow-[6px_6px_12px_#16120e,_-6px_-6px_12px_#3e3228]',
      cardHover: 'hover:border-[#8b7355]',
      textPrimary: 'text-[#e8dcc8]', textSecondary: 'text-[#a89880]',
      accent: 'bg-[#c4a050]', accentText: 'text-[#1e1814]',
      badge: 'bg-[#3d2b1f]/70', badgeText: 'text-[#c4a882]',
      iconColor: 'text-[#c4a050]', border: 'border-[#3d2b1f]',
    },
  },
  {
    name: 'Neo Brutal', fontFamily: 'var(--font-jetbrains)',
    light: {
      container: 'bg-[#f5f0e8]',
      card: 'bg-white border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
      cardHover: 'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5',
      textPrimary: 'text-black', textSecondary: 'text-neutral-600',
      accent: 'bg-black', accentText: 'text-white',
      badge: 'bg-black', badgeText: 'text-white',
      iconColor: 'text-black', border: 'border-black',
    },
    dark: {
      container: 'bg-black',
      card: 'bg-[#1a1a1a] border-3 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]',
      cardHover: 'hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5',
      textPrimary: 'text-white', textSecondary: 'text-neutral-400',
      accent: 'bg-white', accentText: 'text-black',
      badge: 'bg-white', badgeText: 'text-black',
      iconColor: 'text-white', border: 'border-white',
    },
  },
  {
    name: 'Cyber Neon', fontFamily: 'var(--font-space-grotesk)',
    light: {
      container: 'bg-[#0d0f1a]', card: 'bg-[#141828] border-[#00f0ff]/30',
      cardHover: 'hover:border-[#00f0ff] hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]',
      textPrimary: 'text-[#e0e0ff]', textSecondary: 'text-[#8888aa]',
      accent: 'bg-gradient-to-r from-[#00f0ff] to-[#ff00e5]', accentText: 'text-black',
      badge: 'bg-[#00f0ff]/10 border border-[#00f0ff]/30', badgeText: 'text-[#00f0ff]',
      iconColor: 'text-[#00f0ff]', border: 'border-[#00f0ff]/20',
    },
    dark: {
      container: 'bg-[#05050a]', card: 'bg-[#0a0a14] border-[#00f0ff]/20',
      cardHover: 'hover:border-[#ff00e5] hover:shadow-[0_0_20px_rgba(255,0,229,0.25)]',
      textPrimary: 'text-[#c0c0ff]', textSecondary: 'text-[#6666aa]',
      accent: 'bg-gradient-to-r from-[#ff00e5] to-[#00f0ff]', accentText: 'text-black',
      badge: 'bg-[#ff00e5]/10 border border-[#ff00e5]/30', badgeText: 'text-[#ff00e5]',
      iconColor: 'text-[#ff00e5]', border: 'border-[#ff00e5]/15',
    },
  },
  {
    name: 'Bento Precision', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-neutral-50', card: 'bg-white shadow-sm',
      cardHover: 'hover:border-violet-400 hover:shadow-md',
      textPrimary: 'text-neutral-900', textSecondary: 'text-neutral-500',
      accent: 'bg-violet-600', accentText: 'text-white',
      badge: 'bg-violet-50', badgeText: 'text-violet-700',
      iconColor: 'text-violet-600', border: 'border-neutral-200',
    },
    dark: {
      container: 'bg-neutral-900', card: 'bg-neutral-800 shadow-sm shadow-black/30',
      cardHover: 'hover:border-violet-400 hover:shadow-md hover:shadow-violet-900/20',
      textPrimary: 'text-neutral-100', textSecondary: 'text-neutral-400',
      accent: 'bg-violet-500', accentText: 'text-white',
      badge: 'bg-violet-950/50', badgeText: 'text-violet-300',
      iconColor: 'text-violet-400', border: 'border-neutral-700',
    },
  },
  {
    name: 'Soft Neumorphic', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-[#e8e8e8]',
      card: 'bg-[#e8e8e8] shadow-[10px_10px_20px_#c8c8c8,_-10px_-10px_20px_#ffffff]',
      cardHover: 'hover:shadow-[8px_8px_16px_#c8c8c8,_-8px_-8px_16px_#ffffff]',
      textPrimary: 'text-[#2d2d2d]', textSecondary: 'text-[#888888]',
      accent: 'bg-[#6c5ce7] shadow-[3px_3px_6px_#c8c8c8,_-3px_-3px_6px_#ffffff]', accentText: 'text-white',
      badge: 'bg-[#e8e8e8] shadow-[inset_2px_2px_4px_#c8c8c8,_inset_-2px_-2px_4px_#ffffff]', badgeText: 'text-[#6c5ce7]',
      iconColor: 'text-[#6c5ce7]', border: 'border-[#dcdcdc]/50',
    },
    dark: {
      container: 'bg-[#1a1a1a]',
      card: 'bg-[#1a1a1a] shadow-[8px_8px_16px_#0d0d0d,_-8px_-8px_16px_#272727]',
      cardHover: 'hover:shadow-[6px_6px_12px_#0d0d0d,_-6px_-6px_12px_#272727]',
      textPrimary: 'text-[#e0e0e0]', textSecondary: 'text-[#888888]',
      accent: 'bg-[#7c6cf7] shadow-[4px_4px_8px_#0d0d0d,_-4px_-4px_8px_#272727]', accentText: 'text-white',
      badge: 'bg-[#1a1a1a] shadow-[inset_2px_2px_4px_#0d0d0d,_inset_-2px_-2px_4px_#272727]', badgeText: 'text-[#7c6cf7]',
      iconColor: 'text-[#7c6cf7]', border: 'border-[#252525]/50',
    },
  },
  {
    name: 'Prism Gradient', fontFamily: 'var(--font-space-grotesk)',
    light: {
      container: 'bg-gradient-to-br from-rose-50 via-amber-50 to-teal-50',
      card: 'bg-white/80', cardHover: 'hover:border-transparent hover:shadow-[0_0_24px_rgba(244,63,94,0.15)]',
      textPrimary: 'text-gray-800', textSecondary: 'text-gray-500',
      accent: 'bg-gradient-to-r from-rose-500 via-amber-400 to-teal-500', accentText: 'text-white',
      badge: 'bg-gradient-to-r from-rose-100/50 to-amber-100/50', badgeText: 'text-rose-700',
      iconColor: 'text-rose-500', border: 'border-white/60',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900',
      card: 'bg-gray-800/60 backdrop-blur-sm', cardHover: 'hover:border-transparent hover:shadow-[0_0_24px_rgba(251,191,36,0.15)]',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400',
      accent: 'bg-gradient-to-r from-rose-400 via-amber-300 to-teal-400', accentText: 'text-gray-900',
      badge: 'bg-gray-700/50', badgeText: 'text-amber-300',
      iconColor: 'text-amber-400', border: 'border-gray-700/50',
    },
  },
  {
    name: 'Mono Chrome', fontFamily: 'var(--font-jetbrains)',
    light: {
      container: 'bg-white', card: 'bg-gray-50', cardHover: 'hover:border-gray-900',
      textPrimary: 'text-gray-900', textSecondary: 'text-gray-500',
      accent: 'bg-gray-900', accentText: 'text-white',
      badge: 'bg-gray-200', badgeText: 'text-gray-800',
      iconColor: 'text-gray-700', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-gray-950', card: 'bg-gray-900', cardHover: 'hover:border-gray-300',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-500',
      accent: 'bg-white', accentText: 'text-black',
      badge: 'bg-gray-800', badgeText: 'text-gray-200',
      iconColor: 'text-gray-400', border: 'border-gray-800',
    },
  },
  {
    name: 'Aurora Dream', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-gradient-to-br from-teal-50 via-indigo-50 to-purple-50',
      card: 'bg-white/70 backdrop-blur-md',
      cardHover: 'hover:border-purple-300 hover:shadow-[0_0_24px_rgba(168,85,247,0.12)]',
      textPrimary: 'text-gray-800', textSecondary: 'text-gray-500',
      accent: 'bg-gradient-to-r from-teal-400 via-indigo-400 to-purple-500', accentText: 'text-white',
      badge: 'bg-white/60 backdrop-blur-sm', badgeText: 'text-indigo-700',
      iconColor: 'text-indigo-500', border: 'border-white/40',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-950 via-indigo-950/60 to-purple-950/40',
      card: 'bg-gray-800/30 backdrop-blur-md',
      cardHover: 'hover:border-purple-400/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.15)]',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400',
      accent: 'bg-gradient-to-r from-teal-300 via-indigo-300 to-purple-400', accentText: 'text-gray-950',
      badge: 'bg-gray-800/40 backdrop-blur-sm', badgeText: 'text-purple-300',
      iconColor: 'text-purple-400', border: 'border-white/10',
    },
  },
  {
    name: 'Zen Minimal', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#f5f2eb]', card: 'bg-[#faf8f4]', cardHover: 'hover:border-[#9c8c7c]',
      textPrimary: 'text-[#2d2418]', textSecondary: 'text-[#9c8c7c]',
      accent: 'bg-[#5c4a3a]', accentText: 'text-white',
      badge: 'bg-[#ede7dc]', badgeText: 'text-[#5c4a3a]',
      iconColor: 'text-[#8b7a6a]', border: 'border-[#e0d6c8]',
    },
    dark: {
      container: 'bg-[#1c1814]', card: 'bg-[#24201a]', cardHover: 'hover:border-[#8b7a6a]',
      textPrimary: 'text-[#e8e0d4]', textSecondary: 'text-[#8b7a6a]',
      accent: 'bg-[#9c8c7c]', accentText: 'text-[#1c1814]',
      badge: 'bg-[#2d2418]', badgeText: 'text-[#c4b8a8]',
      iconColor: 'text-[#b0a090]', border: 'border-[#3d3228]',
    },
  },
]

// ---------------------------------------------------------------------------
// 10 Premium Themes (Set 2) — fresh design languages with font pairings
// ---------------------------------------------------------------------------

const premiumThemesSet2: ThemeConfig[] = [
  {
    name: 'Vibrant Duotone', fontFamily: 'var(--font-space-grotesk)',
    light: {
      container: 'bg-gradient-to-br from-[#FFF5F0] to-[#E8F0FE]',
      card: 'bg-white border-l-4 border-l-[#FF6B35]',
      cardHover: 'hover:shadow-[0_4px_20px_rgba(255,107,53,0.15)] hover:border-r-[#004E89]',
      textPrimary: 'text-[#1A1A2E]', textSecondary: 'text-[#6B7280]',
      accent: 'bg-gradient-to-r from-[#FF6B35] to-[#004E89]', accentText: 'text-white',
      badge: 'bg-[#FF6B35]/10', badgeText: 'text-[#FF6B35]',
      iconColor: 'text-[#FF6B35]', border: 'border-gray-200',
    },
    dark: {
      container: 'bg-gradient-to-br from-[#1A1A2E] to-[#16213E]',
      card: 'bg-[#1A1A2E] border-l-4 border-l-[#FF6B35]',
      cardHover: 'hover:shadow-[0_4px_20px_rgba(0,78,137,0.3)]',
      textPrimary: 'text-[#E8F0FE]', textSecondary: 'text-[#9CA3AF]',
      accent: 'bg-gradient-to-r from-[#FF6B35] to-[#004E89]', accentText: 'text-white',
      badge: 'bg-[#FF6B35]/15', badgeText: 'text-[#FF8A5C]',
      iconColor: 'text-[#FF8A5C]', border: 'border-[#2D2D4E]',
    },
  },
  {
    name: 'Warm Minimal', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#FAF6F1]', card: 'bg-white',
      cardHover: 'hover:border-[#C4956A] hover:shadow-lg',
      textPrimary: 'text-[#3D2C1B]', textSecondary: 'text-[#A0896E]',
      accent: 'bg-[#C4956A]', accentText: 'text-white',
      badge: 'bg-[#F5EDE4]', badgeText: 'text-[#8B5E34]',
      iconColor: 'text-[#C4956A]', border: 'border-[#E8DDD0]',
    },
    dark: {
      container: 'bg-[#1C1510]', card: 'bg-[#2A2018]',
      cardHover: 'hover:border-[#C4956A] hover:shadow-lg',
      textPrimary: 'text-[#EDE0D4]', textSecondary: 'text-[#A0896E]',
      accent: 'bg-[#C4956A]', accentText: 'text-[#1C1510]',
      badge: 'bg-[#3D2C1B]/60', badgeText: 'text-[#D4B896]',
      iconColor: 'text-[#D4B896]', border: 'border-[#3D2C1B]',
    },
  },
  {
    name: 'Holographic', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50',
      card: 'bg-white/60 backdrop-blur-md',
      cardHover: 'hover:shadow-[0_0_30px_rgba(192,132,252,0.2)] hover:border-transparent',
      textPrimary: 'text-gray-800', textSecondary: 'text-gray-500',
      accent: 'bg-gradient-to-r from-[#C084FC] via-[#67E8F9] to-[#34D399]', accentText: 'text-gray-900',
      badge: 'bg-white/50 backdrop-blur-sm border border-[#C084FC]/20', badgeText: 'text-[#7C3AED]',
      iconColor: 'text-[#7C3AED]', border: 'border-[#C084FC]/20',
    },
    dark: {
      container: 'bg-gradient-to-br from-gray-950 via-purple-950/30 to-cyan-950/20',
      card: 'bg-gray-900/40 backdrop-blur-md',
      cardHover: 'hover:shadow-[0_0_30px_rgba(192,132,252,0.15)] hover:border-transparent',
      textPrimary: 'text-gray-100', textSecondary: 'text-gray-400',
      accent: 'bg-gradient-to-r from-[#C084FC] via-[#67E8F9] to-[#34D399]', accentText: 'text-gray-950',
      badge: 'bg-gray-800/40 backdrop-blur-sm border border-[#C084FC]/10', badgeText: 'text-[#A78BFA]',
      iconColor: 'text-[#A78BFA]', border: 'border-[#C084FC]/10',
    },
  },
  {
    name: 'Terminal Dark', fontFamily: 'var(--font-jetbrains)',
    light: {
      container: 'bg-[#0D0D0D]',
      card: 'bg-[#0D0D0D] border border-[#00FF41]/30',
      cardHover: 'hover:border-[#00FF41] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]',
      textPrimary: 'text-[#00FF41]', textSecondary: 'text-[#00AA2E]',
      accent: 'bg-[#00FF41]', accentText: 'text-[#0D0D0D]',
      badge: 'bg-[#00FF41]/10 border border-[#00FF41]/30', badgeText: 'text-[#00FF41]',
      iconColor: 'text-[#00FF41]', border: 'border-[#00FF41]/20',
    },
    dark: {
      container: 'bg-black', card: 'bg-black border border-[#00FF41]/20',
      cardHover: 'hover:border-[#00FF41] hover:shadow-[0_0_15px_rgba(0,255,65,0.15)]',
      textPrimary: 'text-[#00FF41]', textSecondary: 'text-[#008A20]',
      accent: 'bg-[#00FF41]', accentText: 'text-black',
      badge: 'bg-[#00FF41]/5 border border-[#00FF41]/20', badgeText: 'text-[#00FF41]',
      iconColor: 'text-[#00FF41]', border: 'border-[#00FF41]/10',
    },
  },
  {
    name: 'Editorial Luxe', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#FAFAF8]',
      card: 'bg-white shadow-sm',
      cardHover: 'hover:border-[#C9A96E] hover:shadow-lg',
      textPrimary: 'text-[#1A1A1A]', textSecondary: 'text-[#6B6B6B]',
      accent: 'bg-[#C9A96E]', accentText: 'text-[#1A1A1A]',
      badge: 'bg-[#F5F0E8] border border-[#C9A96E]/30', badgeText: 'text-[#8A733F]',
      iconColor: 'text-[#C9A96E]', border: 'border-[#E8E3D8]',
    },
    dark: {
      container: 'bg-[#121212]',
      card: 'bg-[#1A1A1A] shadow-sm shadow-black/30',
      cardHover: 'hover:border-[#C9A96E] hover:shadow-lg',
      textPrimary: 'text-[#EDEDED]', textSecondary: 'text-[#888888]',
      accent: 'bg-[#C9A96E]', accentText: 'text-[#121212]',
      badge: 'bg-[#1A1A1A] border border-[#C9A96E]/20', badgeText: 'text-[#D4BF8A]',
      iconColor: 'text-[#D4BF8A]', border: 'border-[#2A2A2A]',
    },
  },
  {
    name: 'Pastel Dream', fontFamily: 'var(--font-jakarta)',
    light: {
      container: 'bg-[#FFF5F5]',
      card: 'bg-white/80',
      cardHover: 'hover:border-[#F472B6] hover:shadow-[0_4px_20px_rgba(244,114,182,0.1)]',
      textPrimary: 'text-[#374151]', textSecondary: 'text-[#9CA3AF]',
      accent: 'bg-gradient-to-r from-[#F472B6] via-[#A78BFA] to-[#60A5FA]', accentText: 'text-white',
      badge: 'bg-[#FCE7F3]', badgeText: 'text-[#BE185D]',
      iconColor: 'text-[#F472B6]', border: 'border-[#FDE8E8]',
    },
    dark: {
      container: 'bg-[#1A1423]',
      card: 'bg-[#231B2E]/80',
      cardHover: 'hover:border-[#F472B6] hover:shadow-[0_4px_20px_rgba(244,114,182,0.1)]',
      textPrimary: 'text-[#F3E8FF]', textSecondary: 'text-[#9CA3AF]',
      accent: 'bg-gradient-to-r from-[#F472B6] via-[#A78BFA] to-[#60A5FA]', accentText: 'text-white',
      badge: 'bg-[#2D1B3A]/60', badgeText: 'text-[#F0ABFC]',
      iconColor: 'text-[#E879F9]', border: 'border-[#2D1B3A]',
    },
  },
  {
    name: 'Industrial Grid', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-[#F3F4F6]',
      card: 'bg-white border-2 border-[#D1D5DB]',
      cardHover: 'hover:border-[#FF6B00] hover:shadow-md',
      textPrimary: 'text-[#1F2937]', textSecondary: 'text-[#6B7280]',
      accent: 'bg-[#FF6B00]', accentText: 'text-white',
      badge: 'bg-[#FEF3C7] border border-[#FF6B00]/20', badgeText: 'text-[#B45309]',
      iconColor: 'text-[#FF6B00]', border: 'border-[#D1D5DB]',
    },
    dark: {
      container: 'bg-[#111827]',
      card: 'bg-[#1F2937] border-2 border-[#374151]',
      cardHover: 'hover:border-[#FF6B00] hover:shadow-md',
      textPrimary: 'text-[#F9FAFB]', textSecondary: 'text-[#9CA3AF]',
      accent: 'bg-[#FF6B00]', accentText: 'text-white',
      badge: 'bg-[#451A03]/60 border border-[#FF6B00]/20', badgeText: 'text-[#FBBF24]',
      iconColor: 'text-[#FB923C]', border: 'border-[#374151]',
    },
  },
  {
    name: 'Art Deco Revival', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#F8F4EF]',
      card: 'bg-white border-t-4 border-t-[#E6B422]',
      cardHover: 'hover:shadow-[0_4px_20px_rgba(230,180,34,0.12)]',
      textPrimary: 'text-[#1A1A2E]', textSecondary: 'text-[#6B7280]',
      accent: 'bg-gradient-to-r from-[#1A1A2E] to-[#E6B422]', accentText: 'text-white',
      badge: 'bg-[#FEF9E7] border border-[#E6B422]/30', badgeText: 'text-[#8A6D1A]',
      iconColor: 'text-[#E6B422]', border: 'border-[#E8E3D8]',
    },
    dark: {
      container: 'bg-[#0D0D1A]',
      card: 'bg-[#1A1A2E] border-t-4 border-t-[#E6B422]',
      cardHover: 'hover:shadow-[0_4px_20px_rgba(230,180,34,0.15)]',
      textPrimary: 'text-[#E8E0D4]', textSecondary: 'text-[#9CA3AF]',
      accent: 'bg-gradient-to-r from-[#E6B422] to-[#1A1A2E]', accentText: 'text-[#1A1A2E]',
      badge: 'bg-[#1A1A2E]/60 border border-[#E6B422]/20', badgeText: 'text-[#E6B422]',
      iconColor: 'text-[#E6B422]', border: 'border-[#2A2A4E]',
    },
  },
  {
    name: 'Nordic Frost', fontFamily: 'var(--font-inter)',
    light: {
      container: 'bg-gradient-to-br from-[#E0F2FE] to-[#F0F9FF]',
      card: 'bg-white/70 backdrop-blur-sm',
      cardHover: 'hover:border-[#7DD3FC] hover:shadow-[0_4px_20px_rgba(125,211,252,0.15)]',
      textPrimary: 'text-[#0C4A6E]', textSecondary: 'text-[#64748B]',
      accent: 'bg-gradient-to-r from-[#0284C7] to-[#38BDF8]', accentText: 'text-white',
      badge: 'bg-[#F0F9FF] border border-[#7DD3FC]/30', badgeText: 'text-[#0369A1]',
      iconColor: 'text-[#0284C7]', border: 'border-[#BAE6FD]',
    },
    dark: {
      container: 'bg-gradient-to-br from-[#0F172A] to-[#1E293B]',
      card: 'bg-[#1E293B]/60 backdrop-blur-sm',
      cardHover: 'hover:border-[#38BDF8] hover:shadow-[0_4px_20px_rgba(56,189,248,0.15)]',
      textPrimary: 'text-[#E0F2FE]', textSecondary: 'text-[#94A3B8]',
      accent: 'bg-gradient-to-r from-[#38BDF8] to-[#0284C7]', accentText: 'text-[#0F172A]',
      badge: 'bg-[#0F172A]/60 border border-[#38BDF8]/20', badgeText: 'text-[#7DD3FC]',
      iconColor: 'text-[#38BDF8]', border: 'border-[#1E293B]',
    },
  },
  {
    name: 'Warm Earth', fontFamily: 'var(--font-playfair)',
    light: {
      container: 'bg-[#FDF8F3]',
      card: 'bg-white',
      cardHover: 'hover:border-[#CD5C08] hover:shadow-[0_4px_20px_rgba(205,92,8,0.1)]',
      textPrimary: 'text-[#2D2418]', textSecondary: 'text-[#8B7355]',
      accent: 'bg-gradient-to-r from-[#CD5C08] to-[#4A7C3F]', accentText: 'text-white',
      badge: 'bg-[#FEF3C7] border border-[#CD5C08]/20', badgeText: 'text-[#92400E]',
      iconColor: 'text-[#CD5C08]', border: 'border-[#E8DDD0]',
    },
    dark: {
      container: 'bg-[#1A1510]',
      card: 'bg-[#2A2018]',
      cardHover: 'hover:border-[#CD5C08] hover:shadow-[0_4px_20px_rgba(205,92,8,0.15)]',
      textPrimary: 'text-[#EDE0D4]', textSecondary: 'text-[#A0896E]',
      accent: 'bg-gradient-to-r from-[#CD5C08] to-[#4A7C3F]', accentText: 'text-white',
      badge: 'bg-[#2A2018]/60 border border-[#CD5C08]/20', badgeText: 'text-[#D4A574]',
      iconColor: 'text-[#D4A574]', border: 'border-[#3D3228]',
    },
  },
]

const premiumThemes = [...premiumThemesSet1, ...premiumThemesSet2]

// ---------------------------------------------------------------------------
// Dark mode toggle
// ---------------------------------------------------------------------------

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'fixed right-6 top-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-300',
        'hover:scale-105 active:scale-95',
        isDark
          ? 'bg-white/10 text-white backdrop-blur-md hover:bg-white/20 border border-white/20'
          : 'bg-black/5 text-gray-800 backdrop-blur-md hover:bg-black/10 border border-black/10',
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Section toggle
// ---------------------------------------------------------------------------

function SectionToggle({
  sections,
  active,
  onChange,
}: {
  sections: { id: string; label: string; count: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            'rounded-full px-5 py-2 text-sm font-medium transition-all duration-200',
            active === s.id
              ? 'bg-gray-900 text-white shadow-md dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
          )}
        >
          {s.label}
          <span className="ml-1.5 opacity-60">({s.count})</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClinicWidget — compact card
// ---------------------------------------------------------------------------

function ClinicWidget({ theme, isDark }: { theme: ThemeConfig; isDark: boolean }) {
  const s = th(theme, isDark)

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all duration-200',
        s.card, s.border, s.cardHover,
        'hover:-translate-y-0.5 hover:shadow-md',
      )}
      style={{ fontFamily: theme.fontFamily }}
    >
      <div className="flex items-start justify-between">
        <div className={cn('rounded-lg p-2.5', s.badge)}>
          <Activity className={cn('h-5 w-5', s.iconColor)} />
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', s.badge, s.badgeText)}>
          <CheckCircle className="h-3 w-3" />
          Processed
        </span>
      </div>
      <div className="mt-4 space-y-1">
        <h3 className={cn('text-sm font-semibold', s.textPrimary)}>
          AI Diagnostic Report
        </h3>
        <p className={cn('text-xs', s.textSecondary)}>
          Patient: Sarah Mitchell &middot; Ref: #DR-2407
        </p>
      </div>
      <div className={cn('mt-4 grid grid-cols-2 gap-2 border-t pt-3', s.border)}>
        <div className="space-y-0.5">
          <span className={cn('text-[10px] font-medium uppercase tracking-wider', s.textSecondary)}>Primary</span>
          <p className={cn('text-sm font-medium', s.textPrimary)}>Normal Sinus</p>
        </div>
        <div className="space-y-0.5">
          <span className={cn('text-[10px] font-medium uppercase tracking-wider', s.textSecondary)}>Confidence</span>
          <span className={cn('text-sm font-medium', s.iconColor)}>96.3%</span>
        </div>
      </div>
      <button className={cn('mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors', s.accent, s.accentText, 'hover:opacity-90 active:scale-[0.98]')}>
        <Microscope className="h-3.5 w-3.5" />
        View Full Analysis
        <ArrowRight className="h-3 w-3" />
      </button>
      <p className={cn('mt-3 text-center text-[10px] font-medium uppercase tracking-widest', s.textSecondary)}>
        {theme.name}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PremiumWidget — larger, richer card
// ---------------------------------------------------------------------------

function PremiumWidget({ theme, isDark }: { theme: ThemeConfig; isDark: boolean }) {
  const s = th(theme, isDark)

  return (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-all duration-300',
        s.card, s.border, s.cardHover,
        'hover:-translate-y-1 hover:shadow-xl',
      )}
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', s.badge)}>
            <Heart className={cn('h-6 w-6', s.iconColor)} />
          </div>
          <div>
            <h3 className={cn('text-base font-semibold', s.textPrimary)}>
              Patient Overview
            </h3>
            <p className={cn('text-xs', s.textSecondary)}>
              Sarah Mitchell &middot; 34 yrs &middot; F
            </p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', s.badge, s.badgeText)}>
          <Sparkles className="h-3 w-3" />
          AI Analyzed
        </span>
      </div>

      {/* Metrics grid */}
      <div className={cn('mt-5 grid grid-cols-2 gap-3', s.textPrimary)}>
        <div className={cn('rounded-xl border p-3', s.border)}>
          <div className="flex items-center gap-1.5">
            <Thermometer className={cn('h-3.5 w-3.5', s.iconColor)} />
            <span className={cn('text-[10px] font-medium uppercase tracking-wider', s.textSecondary)}>Temp</span>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            36.8<span className={cn('text-xs font-normal', s.textSecondary)}>&deg;C</span>
          </p>
        </div>
        <div className={cn('rounded-xl border p-3', s.border)}>
          <div className="flex items-center gap-1.5">
            <Heart className={cn('h-3.5 w-3.5', s.iconColor)} />
            <span className={cn('text-[10px] font-medium uppercase tracking-wider', s.textSecondary)}>Heart Rate</span>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            72<span className={cn('text-xs font-normal', s.textSecondary)}> bpm</span>
          </p>
        </div>
        <div className={cn('rounded-xl border p-3', s.border)}>
          <div className="flex items-center gap-1.5">
            <Droplets className={cn('h-3.5 w-3.5', s.iconColor)} />
            <span className={cn('text-[10px] font-medium uppercase tracking-wider', s.textSecondary)}>BP</span>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            120/80<span className={cn('text-xs font-normal', s.textSecondary)}> mmHg</span>
          </p>
        </div>
        <div className={cn('rounded-xl border p-3', s.border)}>
          <div className="flex items-center gap-1.5">
            <Shield className={cn('h-3.5 w-3.5', s.iconColor)} />
            <span className={cn('text-[10px] font-medium uppercase tracking-wider', s.textSecondary)}>Health Score</span>
          </div>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            <span className={cn(s.iconColor)}>92</span>
            <span className={cn('text-xs font-normal', s.textSecondary)}>/100</span>
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className={cn('mt-4 space-y-2', s.textPrimary)}>
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', s.textSecondary)}>Recovery Progress</span>
          <span className={cn('font-semibold', s.iconColor)}>78%</span>
        </div>
        <div className={cn('h-2 overflow-hidden rounded-full', s.badge)}>
          <div className={cn('h-full rounded-full transition-all duration-500', s.accent)} style={{ width: '78%' }} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <button className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all', s.accent, s.accentText, 'hover:opacity-90 active:scale-[0.98]')}>
          <Brain className="h-4 w-4" />
          Full Assessment
          <ArrowRight className="h-4 w-4" />
        </button>
        <button className={cn('flex items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium transition-all', s.border, s.textPrimary, 'hover:bg-black/5 active:scale-[0.98]')}>
          <TrendingUp className={cn('h-4 w-4', s.iconColor)} />
        </button>
      </div>

      <p className={cn('mt-4 text-center text-[10px] font-medium uppercase tracking-widest', s.textSecondary)}>
        {theme.name}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

function ThemeSection({
  title,
  subtitle,
  badge,
  themes,
  isDark,
  variant,
}: {
  title: string
  subtitle: string
  badge: string
  themes: ThemeConfig[]
  isDark: boolean
  variant: 'original' | 'premium'
}) {
  const Widget = variant === 'premium' ? PremiumWidget : ClinicWidget

  return (
    <section>
      <div className="mb-8 text-center">
        <div className={cn(
          'mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium',
          isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500',
        )}>
          <Palette className="h-3 w-3" />
          {badge}
        </div>
        <h2 className={cn('text-3xl font-bold tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
          {title}
        </h2>
        <p className={cn('mt-1.5 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>{subtitle}</p>
      </div>

      <div className={cn(
        'mx-auto max-w-7xl px-4 grid gap-6',
        variant === 'premium'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      )}>
        {themes.map((theme) => (
          <Widget key={theme.name} theme={theme} isDark={isDark} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PremiumThemeCatalog() {
  const [isDark, setIsDark] = useState(false)
  const [activeSection, setActiveSection] = useState<'all' | 'original' | 'premium'>('all')

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  const sections = [
    { id: 'all' as const, label: 'All', count: originalThemes.length + premiumThemes.length },
    { id: 'original' as const, label: 'Original', count: originalThemes.length },
    { id: 'premium' as const, label: 'UI-UX PRO MAX', count: premiumThemes.length },
  ]

  const showOriginal = activeSection === 'all' || activeSection === 'original'
  const showPremium = activeSection === 'all' || activeSection === 'premium'

  return (
    <div className={fontVariables}>
      <div className={cn(
        'min-h-screen py-12 transition-colors duration-300',
        isDark ? 'bg-gray-950' : 'bg-gray-100',
      )}>
        <ThemeToggle isDark={isDark} onToggle={toggleDark} />

        <div className="mx-auto max-w-7xl px-4 pb-8">
          <div className="mb-6 text-center">
            <h1 className={cn('text-4xl font-bold tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
              Premium Theme Catalog
            </h1>
            <p className={cn('mt-2 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
              {originalThemes.length + premiumThemes.length} design directions &mdash; {originalThemes.length} original + {premiumThemes.length} UI-UX PRO MAX
            </p>
          </div>

          <SectionToggle
            sections={sections}
            active={activeSection}
            onChange={(id) => setActiveSection(id as typeof activeSection)}
          />

          <div className={cn('mx-auto mb-12 h-px max-w-lg', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
        </div>

        {showOriginal && (
          <div className="mb-16">
            <ThemeSection
              title="Original Collection"
              subtitle="10 distinct design directions for the Clinic AI platform"
              badge="ORIGINAL"
              themes={originalThemes}
              isDark={isDark}
              variant="original"
            />
          </div>
        )}

        {showOriginal && showPremium && (
          <div className="relative mx-auto mb-16 max-w-7xl px-4">
            <div className={cn('relative flex items-center justify-center', isDark ? 'text-gray-600' : 'text-gray-300')}>
              <div className={cn('h-px flex-1', isDark
                ? 'bg-gradient-to-r from-transparent via-gray-700 to-transparent'
                : 'bg-gradient-to-r from-transparent via-gray-300 to-transparent')}
              />
              <span className={cn(
                'mx-4 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold backdrop-blur-sm',
                isDark ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-300 bg-white/50 text-gray-500',
              )}>
                +
              </span>
              <div className={cn('h-px flex-1', isDark
                ? 'bg-gradient-to-r from-transparent via-gray-700 to-transparent'
                : 'bg-gradient-to-r from-transparent via-gray-300 to-transparent')}
              />
            </div>
          </div>
        )}

        {showPremium && (
          <ThemeSection
            title="UI-UX PRO MAX Collection"
            subtitle="20 next-level design systems — larger, bolder, with per-theme font pairings"
            badge="UI-UX PRO MAX"
            themes={premiumThemes}
            isDark={isDark}
            variant="premium"
          />
        )}
      </div>
    </div>
  )
}
