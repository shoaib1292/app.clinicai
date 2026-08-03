import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { WebsiteLayout } from '@/components/website/website-layout'

export const revalidate = 300

export default async function DoctorsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { id: true, slug: true, name: true, city: true, phone: true, whatsappNumber: true, address: true, logoUrl: true, logoKey: true, heroImageKey: true, brandColor: true, tagline: true, description: true, heroImageUrl: true, socialLinks: true },
  })
  if (!clinic) notFound()

  const doctors = await db.doctor.findMany({
    where: { clinicId: clinic.id, active: true },
    select: { id: true, name: true, speciality: true, qualifications: true },
    take: 20,
  })

  return (
    <WebsiteLayout clinic={clinic}>
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
          Our Doctors
        </h1>
        {doctors.length === 0 ? (
          <p className="text-center" style={{ color: 'var(--website-text-muted)' }}>Doctor information coming soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doc => (
              <div
                key={doc.id}
                className="p-6 text-center"
                style={{
                  background: 'var(--website-surface)',
                  borderRadius: 'var(--website-radius)',
                  boxShadow: 'var(--website-shadow)',
                  border: '1px solid var(--website-border)',
                }}
              >
                <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl font-bold" style={{ background: 'var(--website-primary)' }}>
                  {doc.name.charAt(0)}
                </div>
                <h3 className="font-semibold" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>{doc.name}</h3>
                <p className="text-sm" style={{ color: 'var(--website-text-muted)' }}>{doc.speciality}</p>
                {doc.qualifications && <p className="text-xs mt-1" style={{ color: 'var(--website-text-muted)' }}>{doc.qualifications}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </WebsiteLayout>
  )
}
