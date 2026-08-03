import type { ThemeDefinition } from './types'

export const darkTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  previewColor: 'linear-gradient(135deg, #111111, #1a1a1a)',
  cssVariables: {
    '--website-bg': '#09090b',
    '--website-surface': '#18181b',
    '--website-text': '#fafafa',
    '--website-text-muted': '#71717a',
    '--website-border': '#27272a',
    '--website-radius': '10px',
    '--website-shadow': '0 2px 8px rgba(0,0,0,0.5)',
    '--website-shadow-lg': '0 12px 32px rgba(0,0,0,0.7)',
    '--website-font': '"Inter", sans-serif',
    '--website-font-heading': '"Inter", sans-serif',
  },
}
