import { z } from 'zod'

export const WebsiteContentSchema = z.object({
  hero: z.object({
    headline: z.string().max(80),
    subheadline: z.string().max(160),
    ctaText: z.string().max(30),
    secondaryText: z.string().max(30).optional(),
  }),
  about: z.object({
    title: z.string(),
    body: z.string(),
  }),
  services: z.array(z.object({
    name: z.string(),
    shortDescription: z.string(),
  })).optional(),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).min(3).max(8),
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
})

export type WebsiteContent = z.infer<typeof WebsiteContentSchema>

export function generateContentPrompt(params: {
  clinicName: string
  city: string
  clinicType: string
  specialty: string
  services: string
  doctorList: string
  tone: string
  domain: string
  phone: string
  whatsapp: string
  aboutExtra: string
}): string {
  const { clinicName, city, clinicType, specialty, services, doctorList, tone, domain, phone, aboutExtra } = params

  return `You are a healthcare copywriter creating a clinic website.

CLINIC PROFILE:
- Name: ${clinicName}
- Type: ${clinicType} clinic
- City: ${city}
- Specialty: ${specialty || 'General healthcare'}
- Services: ${services || 'General consultation'}
- Doctors: ${doctorList || 'Experienced medical professionals'}
- Phone: ${phone || 'N/A'}
- Website: ${domain}
- Extra info: ${aboutExtra || 'None'}
- Tone: ${tone} (professional | friendly | modern)

Generate website content in the ${tone} tone. Output valid JSON matching this structure:
{
  "hero": {
    "headline": "string (max 80 chars) - compelling main headline",
    "subheadline": "string (max 160 chars) - supporting text mentioning city or services",
    "ctaText": "string (max 30 chars) - action button text like 'Book Appointment'",
    "secondaryText": "string (max 30 chars, optional) - secondary action like 'Call Now'"
  },
  "about": {
    "title": "string - e.g. 'About [Clinic Name]'",
    "body": "string - 2-3 paragraphs about the clinic, its mission, and what makes it unique"
  },
  "faqs": [
    { "question": "string", "answer": "string" }
  ],
  "seo": {
    "title": "string - SEO page title (50-60 chars ideally)",
    "description": "string - meta description (120-160 chars)"
  }
}

RULES:
- Use real clinic names, services, and doctor names provided above
- Headlines must be different from generic templates — make them clinic-specific
- FAQs should include: how to book, clinic hours, walk-in policy, and services offered
- Output ONLY valid JSON, no markdown, no code blocks, no explanation
- ${tone === 'professional' ? 'Be trustworthy, formal, and authoritative.' : tone === 'friendly' ? 'Be warm, welcoming, and conversational.' : 'Be modern, bold, and concise.'}
- Always include the city name (${city}) where relevant for local SEO`
}
