import type { NextRequest } from 'next/server'

// Build the public origin from reverse-proxy headers (Traefik/Coolify).
// Next.js standalone binds to 0.0.0.0:3000, so `req.url` points at that
// internal address. We must never use it to build client-facing redirects.
export function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''

  if (host) return `${proto}://${host}`

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://app.clinicai.pk'
  )
}

export function requestRedirectUrl(req: NextRequest, path: string): URL {
  return new URL(path, requestOrigin(req))
}
