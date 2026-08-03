import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { WebsiteLayout } from '@/components/website/website-layout'

export const revalidate = 600

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { id: true, slug: true, name: true, city: true, phone: true, whatsappNumber: true, address: true, logoUrl: true, logoKey: true, heroImageKey: true, brandColor: true, tagline: true, description: true, heroImageUrl: true, socialLinks: true, aiGeneratedContent: true },
  })
  if (!clinic) notFound()

  const ai = clinic.aiGeneratedContent ? JSON.parse(clinic.aiGeneratedContent) : null
  const body = ai?.about?.body || clinic.description || ''

  return (
    <WebsiteLayout clinic={clinic}>
      <section className="py-16 px-4 max-w-3xl mx-auto" style={{ background: 'var(--website-surface)' }}>
        <h1 className="text-3xl font-bold mb-6" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
          {ai?.about?.title || `About ${clinic.name}`}
        </h1>
        <div className="prose max-w-none space-y-4 leading-relaxed" style={{ color: 'var(--website-text-muted)' }}>
          {body.split('\n\n').map((p: string, i: number) => <p key={i}>{p}</p>)}
        </div>
      </section>
    </WebsiteLayout>
  )
}
