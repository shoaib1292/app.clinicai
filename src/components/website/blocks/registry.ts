import type { BlockDefinition, BlockCategory, BlockId } from './types'

const registry = new Map<BlockId, BlockDefinition>()

export function registerBlock(def: BlockDefinition) {
  registry.set(def.id, def)
}

export function getBlock(id: BlockId): BlockDefinition | undefined {
  return registry.get(id)
}

export function listBlocks(category?: BlockCategory): BlockDefinition[] {
  const all = Array.from(registry.values())
  if (category) return all.filter(b => b.category === category)
  return all
}

export function getBlockCategories(): { id: BlockCategory; label: string }[] {
  return [
    { id: 'hero', label: 'Hero Sections' },
    { id: 'trust', label: 'Trust & Proof' },
    { id: 'about', label: 'About & Story' },
    { id: 'doctors', label: 'Doctors & Team' },
    { id: 'services', label: 'Services & Pricing' },
    { id: 'gallery', label: 'Gallery & Media' },
    { id: 'booking', label: 'Booking & CTAs' },
    { id: 'info', label: 'Info & Utility' },
  ]
}

// Legacy block ID mapping for migration from old blocks
export const LEGACY_BLOCK_MAP: Record<string, BlockId> = {
  hero: 'hero-gradient',
  about: 'about-split',
  doctors: 'doctors-grid',
  services: 'services-grid',
  gallery: 'gallery-grid',
  testimonials: 'testimonials-cards',
  cta: 'cta-banner',
  contact: 'contact-cards',
}
