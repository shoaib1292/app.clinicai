import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: Request) {
  const body = await req.json()
  const { eventType, path, referrer } = body

  const slug = req.headers.get('x-clinic-slug')
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 })

  const clinic = await db.clinic.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!clinic) return NextResponse.json({ ok: false }, { status: 404 })

  const ipHash = crypto.createHash('sha256')
    .update(req.headers.get('x-forwarded-for') || '127.0.0.1')
    .digest('hex')
    .slice(0, 16)

  if (eventType && path) {
    await db.websiteAnalyticsEvent.create({
      data: {
        clinicId: clinic.id,
        eventType,
        path,
        referrer: referrer?.replace(/^https?:\/\//, '').split('/')[0] || 'direct',
        userAgent: (req.headers.get('user-agent') || '').slice(0, 200),
        ipHash,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
