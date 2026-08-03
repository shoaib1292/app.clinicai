import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import { invalidateHostnameCache } from '@/proxy'
import dns from 'dns/promises'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { clinicId } = await requireClinicScope()
  if (clinicId !== id) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

  const { domain } = await req.json()
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ ok: false, error: 'Domain is required' }, { status: 400 })
  }

  const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

  // Check if domain is already taken
  const existing = await db.clinic.findFirst({
    where: { customDomain: normalizedDomain, id: { not: clinicId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Domain already in use by another clinic' }, { status: 409 })
  }

  // Verify CNAME record points to our platform
  const parentDomain = process.env.DOMAIN || process.env.APP_DOMAIN || 'app.clinicai.pk'
  let verified = false

  try {
    const records = await dns.resolveCname(normalizedDomain)
    verified = records.some(r => r === parentDomain || r === 'clinicai.pk')
  } catch {
    verified = false
  }

  // Update domain + mark as verified if CNAME check passed or force verify for testing
  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: {
      customDomain: normalizedDomain,
      customDomainVerified: verified || process.env.NODE_ENV !== 'production',
    },
  })

  await invalidateHostnameCache(clinic.slug, clinic.customDomain)

  return NextResponse.json({
    ok: true,
    data: {
      domain: normalizedDomain,
      verified: clinic.customDomainVerified,
      requiredRecord: `CNAME → ${parentDomain}`,
    },
  })
}
