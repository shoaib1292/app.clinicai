import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import ZAI from 'z-ai-web-dev-sdk'
import { WebsiteContentSchema, generateContentPrompt, type WebsiteContent } from '@/lib/website-content-schema'

export async function POST(req: Request) {
  const { clinicId } = await requireClinicScope()
  const body = await req.json()

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true, city: true, address: true, phone: true, whatsappNumber: true,
      tagline: true, description: true, slug: true, customDomain: true,
      brandColor: true,
      doctors: { where: { active: true }, select: { name: true, speciality: true, qualifications: true, bio: true, languages: true, imageKey: true } },
      services: { where: { active: true }, select: { name: true, description: true } },
    },
  })
  if (!clinic) return NextResponse.json({ ok: false, error: 'Clinic not found' }, { status: 404 })

  const wizard = {
    clinicName: body.clinicName || clinic.name,
    city: body.city || clinic.city || 'Karachi',
    clinicType: body.clinicType || 'multi',
    specialty: body.specialty || clinic.tagline || '',
    services: body.services || clinic.services.map(s => s.name).join(', '),
    tone: body.tone || 'professional',
    aboutExtra: body.aboutExtra || clinic.description || '',
  }

  const doctorList = clinic.doctors.map(d => `${d.name} (${d.speciality})`).join(', ')
  const serviceList = wizard.services || clinic.services.map(s => s.name).join(', ')
  const domain = clinic.customDomain || `${clinic.slug}.clinicai.pk`

  let aiContent: WebsiteContent

  try {
    const prompt = generateContentPrompt({
      clinicName: wizard.clinicName,
      city: wizard.city,
      clinicType: wizard.clinicType,
      specialty: wizard.specialty,
      services: wizard.services,
      doctorList,
      tone: wizard.tone,
      aboutExtra: wizard.aboutExtra,
      domain,
      phone: clinic.phone || '',
      whatsapp: clinic.whatsappNumber || '',
    })

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a JSON-only API. Output valid JSON with no markdown wrappers, no code blocks, no explanations.' },
        { role: 'user', content: prompt },
      ] as never,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const json = extractJSON(raw)
    const parsed = WebsiteContentSchema.parse(json)
    aiContent = parsed
  } catch (err) {
    console.warn('[generate-content] LLM failed, falling back to templates:', err instanceof Error ? err.message : err)
    aiContent = generateFallbackContent({
      ...wizard,
      doctorList,
      serviceList,
      domain,
      phone: clinic.phone || '',
      whatsapp: clinic.whatsappNumber || '',
      address: clinic.address || '',
    })
  }

  // Build a BlockConfig[] from the AI-generated content so the public
  // website (which reads only blocksConfig) can render it immediately.
  const blocksConfig: Array<{ blockId: string; order: number; visible: boolean; content: Record<string, any> }> = [
    {
      blockId: 'hero-gradient',
      order: 0,
      visible: true,
      content: {
        ...(aiContent.hero?.headline && { headline: aiContent.hero.headline }),
        ...(aiContent.hero?.subheadline && { subheadline: aiContent.hero.subheadline }),
        ...(aiContent.hero?.ctaText && { ctaText: aiContent.hero.ctaText }),
      },
    },
    {
      blockId: 'about-split',
      order: 1,
      visible: true,
      content: {
        ...(aiContent.about?.title && { title: aiContent.about.title }),
        ...(aiContent.about?.body && { body: aiContent.about.body }),
      },
    },
    {
      blockId: 'doctors-grid',
      order: 2,
      visible: clinic.doctors.length > 0,
      content: {},
    },
    {
      blockId: 'services-grid',
      order: 3,
      visible: true,
      content: {},
    },
    {
      blockId: 'cta-banner',
      order: 4,
      visible: true,
      content: {
        heading: `Ready to Visit ${clinic.name}?`,
        subtitle: 'Schedule your appointment today — we\'re here when you need us.',
      },
    },
  ]

  // Add FAQ block if the AI generated any
  if (aiContent.faqs && aiContent.faqs.length > 0) {
    blocksConfig.push({
      blockId: 'faq',
      order: blocksConfig.length,
      visible: true,
      content: { items: aiContent.faqs },
    })
  }

  blocksConfig.push(
    { blockId: 'contact-cards', order: blocksConfig.length, visible: true, content: {} },
    { blockId: 'footer', order: blocksConfig.length, visible: true, content: {} },
  )

  await db.clinic.update({
    where: { id: clinicId },
    data: {
      aiGeneratedContent: JSON.stringify(aiContent),   // kept for SEO / layout fallback
      blocksConfig: JSON.stringify(blocksConfig),
      ...(wizard.specialty && { tagline: wizard.specialty }),
    },
  })

  return NextResponse.json({ ok: true, data: aiContent })
}

function extractJSON(raw: string): unknown {
  const trimmed = raw.trim()

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim())
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
  }

  return JSON.parse(trimmed)
}

function generateFallbackContent(info: Record<string, string>): WebsiteContent {
  const { clinicName, city, doctorList, serviceList, domain, phone, tone, aboutExtra, specialty } = info
  const servicesArray = (serviceList || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  const toneMap: Record<string, { hero: string; about: string }> = {
    professional: { hero: `Excellence in Healthcare`, about: `is dedicated to providing the highest standard of medical care` },
    friendly: { hero: `Your Family's Health, Our Priority`, about: `believes in warm, compassionate healthcare for the whole family` },
    modern: { hero: `Modern Healthcare, Simplified`, about: `brings cutting-edge medical technology and contemporary care` },
  }
  const t = toneMap[tone || 'professional'] || toneMap.professional

  return {
    hero: {
      headline: specialty || `${clinicName} — ${t.hero}`,
      subheadline: `${city ? `Serving ${city} with ${tone === 'friendly' ? 'warmth and compassion' : tone === 'modern' ? 'modern facilities and expert care' : 'professional excellence'}. ` : ''}${doctorList ? 'Our team includes ' + doctorList + '.' : ''}`,
      ctaText: 'Book Appointment',
    },
    about: {
      title: `About ${clinicName}`,
      body: `${clinicName} ${t.about}. ${aboutExtra || (city ? `Located in the heart of ${city}, we serve our community with dedication and expertise. ` : '')}${doctorList ? `Our experienced team of specialists — ${doctorList} — work together to provide comprehensive care under one roof. ` : 'We are committed to making quality healthcare accessible and convenient for everyone. '}${tone === 'modern' ? 'We combine the latest medical technology with a patient-first approach for the best outcomes.' : tone === 'friendly' ? 'We treat every patient like family — because to us, you are.' : 'Our commitment to medical excellence drives everything we do.'}`,
    },
    services: servicesArray.length > 0
      ? servicesArray.map(name => ({ name, shortDescription: `Professional ${name.toLowerCase()} services at ${clinicName}${city ? `, ${city}` : ''}` }))
      : [{ name: 'General Consultation', shortDescription: 'Comprehensive health check-ups and medical advice for all ages' }],
    faqs: [
      { question: 'How do I book an appointment?', answer: `Book online at ${domain}/portal${phone ? `, call us at ${phone}` : ''}, or visit our clinic.` },
      { question: 'What are your clinic hours?', answer: 'Open Monday to Saturday, 9 AM to 9 PM. Sunday closed. Timings may vary by doctor.' },
      { question: 'Do you accept walk-in patients?', answer: 'Yes, walk-ins are welcome. We recommend booking ahead to minimize wait time.' },
      { question: `What services does ${clinicName} offer?`, answer: `${servicesArray.slice(0, 5).join(', ') || 'Comprehensive healthcare'} and more.` },
    ],
    seo: {
      title: `${clinicName} — ${city ? 'Best Medical Care in ' + city + ' | ' : ''}Book Appointment Online`,
      description: `${clinicName}${city ? ` in ${city}` : ''} offers ${servicesArray.slice(0, 3).join(', ') || 'comprehensive healthcare'}. Book online, call, or visit us today.`,
    },
  }
}
