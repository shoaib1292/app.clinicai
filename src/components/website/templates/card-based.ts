import type { TemplateDefinition } from '../blocks/types'
import { HeroBlock } from '../blocks/hero-block'
import { DoctorsBlock } from '../blocks/doctors-block'
import { ServicesBlock } from '../blocks/services-block'
import { TestimonialsBlock } from '../blocks/testimonials-block'
import { CTABlock } from '../blocks/cta-block'
import { FooterBlock } from '../blocks/footer-block'

export const cardBasedTemplate: TemplateDefinition = {
  id: 'card-based',
  name: 'Card Based',
  thumbnailUrl: '/templates/card-based-thumb.png',
  layout: [
    { id: 'hero', component: HeroBlock },
    { id: 'doctors', component: DoctorsBlock },
    { id: 'services', component: ServicesBlock },
    { id: 'testimonials', component: TestimonialsBlock },
    { id: 'cta', component: CTABlock },
    { id: 'footer', component: FooterBlock },
  ],
}
