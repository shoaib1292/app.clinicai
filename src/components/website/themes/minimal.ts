import type { ThemeDefinition } from './types'

export const minimalTheme: ThemeDefinition = {
  id: 'minimal',
  name: 'Minimal',
  previewColor: 'linear-gradient(135deg, #ffffff, #fafafa)',
  cssVariables: {
    '--website-bg': '#ffffff',
    '--website-surface': '#fafafa',
    '--website-text': '#171717',
    '--website-text-muted': '#737373',
    '--website-border': '#f5f5f5',
    '--website-radius': '4px',
    '--website-shadow': '0 1px 2px rgba(0,0,0,0.04)',
    '--website-shadow-lg': '0 4px 8px rgba(0,0,0,0.06)',
    '--website-font': '"Inter", sans-serif',
    '--website-font-heading': '"Inter", sans-serif',
  },
}
