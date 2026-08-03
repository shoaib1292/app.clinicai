import type { ThemeDefinition } from './themes/types'
import { modernTheme } from './themes/modern'
import { medicalTheme } from './themes/medical'
import { elegantTheme } from './themes/elegant'
import { darkTheme } from './themes/dark'
import { minimalTheme } from './themes/minimal'

export const themeRegistry: Record<string, ThemeDefinition> = {
  modern: modernTheme,
  medical: medicalTheme,
  elegant: elegantTheme,
  dark: darkTheme,
  minimal: minimalTheme,
}

export function getTheme(id: string): ThemeDefinition {
  return themeRegistry[id] || themeRegistry['modern']
}

export interface ThemeInfo {
  id: string
  name: string
  previewColor: string
}

export function listThemes(): ThemeInfo[] {
  return Object.values(themeRegistry).map(t => ({
    id: t.id,
    name: t.name,
    previewColor: t.previewColor,
  }))
}
