import React from 'react'

export type BlockCategory =
  | 'hero'
  | 'trust'
  | 'about'
  | 'doctors'
  | 'services'
  | 'gallery'
  | 'booking'
  | 'info'

export type BlockId =
  // Hero (4)
  | 'hero-gradient' | 'hero-image' | 'hero-minimal' | 'hero-split'
  // Trust (5)
  | 'stats-counters' | 'social-proof' | 'testimonials-cards' | 'google-reviews' | 'certifications'
  // About (4)
  | 'about-split' | 'about-timeline' | 'about-vision' | 'doctor-spotlight'
  // Doctors (4)
  | 'doctors-grid' | 'doctors-carousel' | 'doctors-list' | 'doctor-profile'
  // Services (3)
  | 'services-grid' | 'services-detailed' | 'pricing-table'
  // Gallery (3)
  | 'gallery-3d' | 'gallery-grid' | 'virtual-tour'
  // Booking (4)
  | 'booking-widget' | 'cta-banner' | 'cta-emergency' | 'floating-chat'
  // Info (7)
  | 'contact-cards' | 'map' | 'faq' | 'hours' | 'insurance' | 'blog-highlights' | 'footer'
  // Legacy (kept for compatibility, mapped to new blocks)
  | 'hero' | 'about' | 'doctors' | 'services' | 'gallery' | 'testimonials' | 'cta' | 'contact'

export interface TestimonialItem {
  name: string
  text: string
  rating: number
  avatarUrl?: string
  date?: string
}

export interface GalleryImage {
  url: string
  alt: string
  caption?: string
}

export interface ServiceItem {
  name: string
  shortDescription: string
  durationMin?: number
  fee?: number
  icon?: string
}

export interface DoctorItem {
  id: string
  name: string
  speciality: string
  qualifications?: string
  bio?: string
  languages?: string
  imageKey?: string
  imageUrl?: string   // @deprecated — for legacy blocks
}

export interface ClinicWebsiteData {
  id: string
  slug: string
  name: string
  city: string | null
  phone: string | null
  whatsappNumber: string | null
  address: string | null
  logoKey: string | null
  logoUrl: string | null   // @deprecated
  brandColor: string | null
  tagline: string | null
  description: string | null
  heroImageKey: string | null
  heroImageUrl: string | null  // @deprecated
  headingFont?: string | null
  bodyFont?: string | null
  socialLinks?: string | null
  clinicStats?: string | null  // JSON: { yearsOfExperience, totalPatients, totalDoctors, totalBranches }
  blocksConfig?: string | null  // JSON: BlockConfig[]
  doctors?: DoctorItem[]
  services?: ServiceItem[]
  galleryImages?: GalleryImage[]
  latitude?: number | null
  longitude?: number | null
  googleMapsUrl?: string | null
}

export interface BlockProps {
  clinic: ClinicWebsiteData
  content?: Record<string, any>
  visual?: {
    backgroundColor?: string
    headingColor?: string
    accentColor?: string
    spacing?: 'compact' | 'normal' | 'spacious'
  }
}

export type BlockComponent = React.FC<BlockProps>

export interface BlockManifest {
  name?: string
  industries?: string[]
  tags?: string[]
  pairsWellWith?: BlockId[]
  visualWeight?: 'light' | 'medium' | 'heavy'
  contentDensity?: 'minimal' | 'balanced' | 'detailed'
}

export interface BlockDefinition {
  id: BlockId
  label: string
  category: BlockCategory
  component: BlockComponent
  defaultContent: Record<string, any>
  description: string
  requiredData: string[]
  manifest?: BlockManifest
}

export interface BlockConfig {
  blockId: BlockId
  order: number
  visible: boolean
  content: Record<string, any>
  visual?: {
    backgroundColor?: string
    headingColor?: string
    accentColor?: string
    spacing?: 'compact' | 'normal' | 'spacious'
  }
}

export interface TemplateBlock {
  id: BlockId
  component: BlockComponent
}

export interface TemplateDefinition {
  id: string
  name: string
  thumbnailUrl: string
  layout: TemplateBlock[]
}
