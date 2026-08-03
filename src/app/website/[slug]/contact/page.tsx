import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { WebsiteLayout } from '@/components/website/website-layout'

export const revalidate = 600

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { id: true, slug: true, name: true, city: true, phone: true, whatsappNumber: true, address: true, logoUrl: true, logoKey: true, heroImageKey: true, brandColor: true, tagline: true, description: true, heroImageUrl: true, socialLinks: true },
  })
  if (!clinic) notFound()

  return (
    <WebsiteLayout clinic={clinic}>
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
          Contact Us
        </h1>
        <div className="grid sm:grid-cols-2 gap-6">
          {clinic.address && (
            <div className="p-5" style={{ background: 'var(--website-surface)', borderRadius: 'var(--website-radius)', boxShadow: 'var(--website-shadow)', border: '1px solid var(--website-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--website-text)' }}>Address</p>
              <p className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}</p>
            </div>
          )}
          {clinic.phone && (
            <div className="p-5" style={{ background: 'var(--website-surface)', borderRadius: 'var(--website-radius)', boxShadow: 'var(--website-shadow)', border: '1px solid var(--website-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--website-text)' }}>Phone</p>
              <a href={`tel:${clinic.phone}`} className="text-sm" style={{ color: 'var(--website-primary)' }}>{clinic.phone}</a>
            </div>
          )}
          {clinic.whatsappNumber && (
            <div className="p-5" style={{ background: 'var(--website-surface)', borderRadius: 'var(--website-radius)', boxShadow: 'var(--website-shadow)', border: '1px solid var(--website-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--website-text)' }}>WhatsApp</p>
              <a href={`https://wa.me/${clinic.whatsappNumber.replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--website-primary)' }}>{clinic.whatsappNumber}</a>
            </div>
          )}
        </div>
      </section>
    </WebsiteLayout>
  )
}
