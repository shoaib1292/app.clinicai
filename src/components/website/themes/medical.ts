import type { ThemeDefinition } from './types'

export const medicalTheme: ThemeDefinition = {
  id: 'medical',
  name: 'Medical',
  previewColor: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
  cssVariables: {
    '--website-bg': '#f8fafc',
    '--website-surface': '#ffffff',
    '--website-text': '#0f172a',
    '--website-text-muted': '#64748b',
    '--website-border': '#e2e8f0',
    '--website-radius': '8px',
    '--website-shadow': '0 1px 2px rgba(0,0,0,0.06)',
    '--website-shadow-lg': '0 4px 12px rgba(0,0,0,0.08)',
    '--website-font': '"Inter", sans-serif',
    '--website-font-heading': '"Inter", sans-serif',
  },
}
