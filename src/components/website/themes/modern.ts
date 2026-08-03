import type { ThemeDefinition } from './types'

export const modernTheme: ThemeDefinition = {
  id: 'modern',
  name: 'Modern',
  previewColor: 'linear-gradient(135deg, #ffffff, #f5f5f5)',
  cssVariables: {
    '--website-bg': '#ffffff',
    '--website-surface': '#f9fafb',
    '--website-text': '#111827',
    '--website-text-muted': '#6b7280',
    '--website-border': '#e5e7eb',
    '--website-radius': '12px',
    '--website-shadow': '0 1px 3px rgba(0,0,0,0.08)',
    '--website-shadow-lg': '0 8px 24px rgba(0,0,0,0.12)',
    '--website-font': '"Inter", sans-serif',
    '--website-font-heading': '"Inter", sans-serif',
  },
}
