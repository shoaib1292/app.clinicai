import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { customDomain: true, slug: true },
  })
  if (!clinic) return new NextResponse('', { status: 404 })

  const domain = clinic.customDomain || `${clinic.slug}.clinicai.pk`
  const baseUrl = `https://${domain}`

  return new NextResponse(
    `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
