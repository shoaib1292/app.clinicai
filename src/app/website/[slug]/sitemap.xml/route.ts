import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const revalidate = 86400 // daily

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clinic = await db.clinic.findUnique({
    where: { slug, websiteEnabled: true },
    select: { customDomain: true, slug: true },
  })
  if (!clinic) return new NextResponse('Not found', { status: 404 })

  const domain = clinic.customDomain || `${clinic.slug}.clinicai.pk`
  const baseUrl = `https://${domain}`
  const pages = ['/', '/about', '/doctors', '/contact']

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400' },
  })
}
