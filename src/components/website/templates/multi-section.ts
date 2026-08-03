import type { TemplateDefinition } from '../blocks/types'
import { HeroBlock } from '../blocks/hero-block'
import { AboutBlock } from '../blocks/about-block'
import { ServicesBlock } from '../blocks/services-block'
import { DoctorsBlock } from '../blocks/doctors-block'
import { GalleryBlock } from '../blocks/gallery-block'
import { TestimonialsBlock } from '../blocks/testimonials-block'
import { CTABlock } from '../blocks/cta-block'
import { ContactBlock } from '../blocks/contact-block'
import { FooterBlock } from '../blocks/footer-block'

export const multiSectionTemplate: TemplateDefinition = {
  id: 'multi-section',
  name: 'Multi Section',
  thumbnailUrl: '/templates/multi-section-thumb.png',
  layout: [
    { id: 'hero', component: HeroBlock },
    { id: 'services', component: ServicesBlock },
    { id: 'about', component: AboutBlock },
    { id: 'doctors', component: DoctorsBlock },
    { id: 'gallery', component: GalleryBlock },
    { id: 'testimonials', component: TestimonialsBlock },
    { id: 'cta', component: CTABlock },
    { id: 'contact', component: ContactBlock },
    { id: 'footer', component: FooterBlock },
  ],
}
