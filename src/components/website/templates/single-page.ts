import type { TemplateDefinition } from '../blocks/types'
import { HeroBlock } from '../blocks/hero-block'
import { AboutBlock } from '../blocks/about-block'
import { ServicesBlock } from '../blocks/services-block'
import { DoctorsBlock } from '../blocks/doctors-block'
import { CTABlock } from '../blocks/cta-block'
import { ContactBlock } from '../blocks/contact-block'
import { FooterBlock } from '../blocks/footer-block'

export const singlePageTemplate: TemplateDefinition = {
  id: 'single-page',
  name: 'Single Page',
  thumbnailUrl: '/templates/single-page-thumb.png',
  layout: [
    { id: 'hero', component: HeroBlock },
    { id: 'about', component: AboutBlock },
    { id: 'services', component: ServicesBlock },
    { id: 'doctors', component: DoctorsBlock },
    { id: 'cta', component: CTABlock },
    { id: 'contact', component: ContactBlock },
    { id: 'footer', component: FooterBlock },
  ],
}
