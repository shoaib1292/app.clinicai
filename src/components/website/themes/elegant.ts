import type { ThemeDefinition } from './types'

export const elegantTheme: ThemeDefinition = {
  id: 'elegant',
  name: 'Elegant',
  previewColor: 'linear-gradient(135deg, #1a1a2e, #16213e)',
  cssVariables: {
    '--website-bg': '#0a0a0a',
    '--website-surface': '#141414',
    '--website-text': '#fafafa',
    '--website-text-muted': '#a3a3a3',
    '--website-border': '#262626',
    '--website-radius': '16px',
    '--website-shadow': '0 2px 8px rgba(0,0,0,0.4)',
    '--website-shadow-lg': '0 12px 40px rgba(0,0,0,0.6)',
    '--website-font': '"Inter", sans-serif',
    '--website-font-heading': '"Playfair Display", serif',
  },
}
