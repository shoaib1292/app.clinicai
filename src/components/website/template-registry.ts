import type { TemplateDefinition } from './blocks/types'
import { singlePageTemplate } from './templates/single-page'
import { multiSectionTemplate } from './templates/multi-section'
import { cardBasedTemplate } from './templates/card-based'

export const templateRegistry: Record<string, TemplateDefinition> = {
  'single-page': singlePageTemplate,
  'multi-section': multiSectionTemplate,
  'card-based': cardBasedTemplate,
}

export function getTemplate(id: string): TemplateDefinition {
  return templateRegistry[id] || templateRegistry['single-page']
}

export interface TemplateInfo {
  id: string
  name: string
  thumbnailUrl: string
  blockCount: number
}

export function listTemplates(): TemplateInfo[] {
  return Object.values(templateRegistry).map(t => ({
    id: t.id,
    name: t.name,
    thumbnailUrl: t.thumbnailUrl,
    blockCount: t.layout.length,
  }))
}
