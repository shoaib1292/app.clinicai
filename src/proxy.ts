import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { store } from '@/lib/store'

const SESSION_COOKIE = 'clinicsai_session'
const REFRESH_COOKIE = 'clinicsai_refresh'

// ─── Hostname → Clinic Resolution (Redis-cached) ─────────────────────
const CACHE_TTL_HIT = 3600   // 1 hour for found clinics
const CACHE_TTL_MISS = 300   // 5 min for not-found hostnames
const CACHE_PREFIX = 'hostname:'

function getHostname(request: NextRequest): string {
  let host = request.headers.get('x-forwarded-host') ||
         request.headers.get('host') ||
         request.nextUrl.host
  // Strip port for matching (e.g., "al-shifa.localhost:8000" → "al-shifa.localhost")
  return host.replace(/:\d+$/, '')
}

async function resolveClinicFromHostname(hostname: string): Promise<{ clinicId: string; slug: string } | null> {
  const APP_DOMAIN = process.env.APP_DOMAIN || 'app.clinicai.pk'

  // Skip resolution for main app domain
  if (hostname === APP_DOMAIN) return null

  const cacheKey = CACHE_PREFIX + hostname

  // 1. Redis/in-memory cache check
  const cached = await store.get<string>(cacheKey)
  if (cached !== null) return cached === 'NONE' ? null : JSON.parse(cached)

  // 2. DB check — custom domain first, then subdomain
  let result: { clinicId: string; slug: string } | null = null

  try {
    const { db } = await import('@/lib/db')
    const customMatch = await db.clinic.findFirst({
      where: { customDomain: hostname, customDomainVerified: true, websiteEnabled: true },
      select: { id: true, slug: true }
    })
    if (customMatch) result = { clinicId: customMatch.id, slug: customMatch.slug }

    if (!result) {
      // Try parent domain subdomains (clinicai.pk in prod, localhost in dev)
      const parentDomains = [process.env.PARENT_DOMAIN || 'clinicai.pk']
      if (process.env.NODE_ENV !== 'production') parentDomains.push('localhost')

      for (const parentDomain of parentDomains) {
        if (hostname.endsWith('.' + parentDomain) || hostname === parentDomain) {
          const slug = hostname === parentDomain ? hostname : hostname.replace('.' + parentDomain, '')
          const subMatch = await db.clinic.findFirst({
            where: { slug, websiteEnabled: true },
            select: { id: true, slug: true }
          })
          if (subMatch) {
            result = { clinicId: subMatch.id, slug: subMatch.slug }
            break
          }
        }
      }
    }
  } catch {}

  // 3. Populate cache
  await store.set(cacheKey, result ? JSON.stringify(result) : 'NONE',
    result ? CACHE_TTL_HIT : CACHE_TTL_MISS)

  return result
}

export async function invalidateHostnameCache(slug: string, customDomain: string | null) {
  const parentDomain = process.env.PARENT_DOMAIN || 'clinicai.pk'
  await store.del(CACHE_PREFIX + slug + '.' + parentDomain)
  if (customDomain) await store.del(CACHE_PREFIX + customDomain)
}

// ─── End hostname resolution ─────────────────────────────────────────

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*']
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie',
}

function addCorsHeaders(response: NextResponse, origin: string | null) {
  const allowed = ALLOWED_ORIGINS.includes('*') ? (origin || '*') : (ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0])
  response.headers.set('Access-Control-Allow-Origin', allowed || '*')
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

// ─── Rate limiting ──────────────────────────────────────────────────────
// Dual-mode: In-memory (sandbox) or Redis-backed (production).
// Redis mode auto-activates when STORE_TYPE=redis is set.
const RATE_LIMIT_WINDOW_SEC = 60
const RATE_LIMIT_MAX = { default: 100, auth: 10, webhook: 200 }
const RATE_LIMIT_REDIS_PREFIX = 'ratelimit:'

// In-memory fallback
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
}

let redisStore: { get: (k: string) => Promise<number | null>; set: (k: string, v: number, ttl: number) => Promise<void> } | null = null

// Lazy-init Redis rate limiter (avoids blocking middleware on import)
function getRedisRateLimiter() {
  if (redisStore) return redisStore
  if (process.env.STORE_TYPE === 'redis') {
    // Dynamic import — only loads in redis mode
    redisStore = {
      async get(key: string) {
        const { store } = await import('./lib/store')
        return store.get<number>(`${RATE_LIMIT_REDIS_PREFIX}${key}`)
      },
      async set(key: string, v: number, ttl: number) {
        const { store } = await import('./lib/store')
        await store.set(`${RATE_LIMIT_REDIS_PREFIX}${key}`, v, ttl)
      },
    }
  }
  return redisStore
}

async function checkRateLimit(key: string, limit: number): Promise<boolean> {
  const redis = getRedisRateLimiter()
  if (redis) {
    const count = (await redis.get(key)) ?? 0
    if (count >= limit) return false
    await redis.set(key, count + 1, RATE_LIMIT_WINDOW_SEC)
    return true
  }

  // In-memory fallback
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key)
  }
}, 5 * 60 * 1000)

function parseJwt(token: string): { exp: number; [key: string]: unknown } | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    // Our tokens are custom 2-part format: base64url(body).base64url(sig)
    // Unlike standard 3-part JWT (header.payload.sig), our body IS part[0].
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

const authRoutes = ['/api/auth/login', '/api/auth/signup', '/api/auth/forgot-password', '/api/auth/reset', '/api/auth/2fa']

async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // ─── Clinic website domain resolution ───
  const hostname = getHostname(request)
  const clinic = await resolveClinicFromHostname(hostname)

  if (clinic) {
    // Block dashboard routes on clinic domains
    if (pathname.startsWith('/dashboard')) {
      return new NextResponse('Not Found', { status: 404 })
    }

    // Passthrough: don't rewrite patient portal, API, or special paths
    if (pathname.startsWith('/p/') || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      const passthrough = NextResponse.next()
      applySecurityHeaders(passthrough)
      return addCorsHeaders(passthrough, origin)
    }

    // Rewrite to internal website route: /(website)/[slug]/...
    const url = request.nextUrl.clone()
    url.pathname = `/website/${clinic.slug}${pathname}`
    return NextResponse.rewrite(url)
  }
  // ─── End clinic domain resolution ───

  // CORS preflight
  if (request.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    return addCorsHeaders(res, origin)
  }

  // Auth refresh on dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value
    const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value

    if (sessionCookie) {
      const payload = parseJwt(sessionCookie)
      if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
        if (refreshCookie) {
          try {
            const fwdProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
            const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
            const baseUrl = `${fwdProto}://${fwdHost}`
            const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
              method: 'POST',
              headers: { Cookie: `${REFRESH_COOKIE}=${refreshCookie}` },
            })
            if (refreshRes.ok) {
              const response = NextResponse.next()
              refreshRes.headers.forEach((value, key) => {
                if (key.toLowerCase() === 'set-cookie') response.headers.append('Set-Cookie', value)
              })
              applySecurityHeaders(response)
              addCorsHeaders(response, origin)
              return response
            }
          } catch {}
        }
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        const redir = NextResponse.redirect(loginUrl)
        return addCorsHeaders(redir, origin)
      }
    } else if (refreshCookie) {
      try {
        const fwdProto2 = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
        const fwdHost2 = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
        const baseUrl2 = `${fwdProto2}://${fwdHost2}`
        const refreshRes = await fetch(`${baseUrl2}/api/auth/refresh`, {
          method: 'POST',
          headers: { Cookie: `${REFRESH_COOKIE}=${refreshCookie}` },
        })
        if (refreshRes.ok) {
          const response = NextResponse.next()
          refreshRes.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') response.headers.append('Set-Cookie', value)
          })
          applySecurityHeaders(response)
          addCorsHeaders(response, origin)
          return response
        }
      } catch {}
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const redir2 = NextResponse.redirect(loginUrl)
      return addCorsHeaders(redir2, origin)
    } else {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const redir3 = NextResponse.redirect(loginUrl)
      return addCorsHeaders(redir3, origin)
    }
  }

  const response = NextResponse.next()
  applySecurityHeaders(response)

  // Rate limiting
  const clientIp = getRateLimitKey(request)
  if (authRoutes.some((r) => pathname.startsWith(r))) {
    if (!(await checkRateLimit(clientIp, RATE_LIMIT_MAX.auth))) {
      const rateLimitRes = new NextResponse(JSON.stringify({ error: 'Too many login attempts. Try again later.' }), {
        status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      })
      return addCorsHeaders(rateLimitRes, origin)
    }
  } else if (pathname.startsWith('/api/webhooks')) {
    if (!(await checkRateLimit(clientIp, RATE_LIMIT_MAX.webhook))) {
      const rateLimitRes = new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
      return addCorsHeaders(rateLimitRes, origin)
    }
  } else if (pathname.startsWith('/api/')) {
    if (!(await checkRateLimit(clientIp, RATE_LIMIT_MAX.default))) {
      const rateLimitRes = new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
      return addCorsHeaders(rateLimitRes, origin)
    }
  }

  return addCorsHeaders(response, origin)
}

function applySecurityHeaders(response: NextResponse) {
  // No X-Frame-Options — use CSP frame-ancestors instead (supports cross-origin)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  const domain = process.env.DOMAIN ? `https://${process.env.DOMAIN}` : ''
  const apiDomain = process.env.API_DOMAIN ? `https://${process.env.API_DOMAIN}` : ''
  const appDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clinicai.pk'
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss: https://cloudflareinsights.com ${domain} ${apiDomain}; frame-ancestors 'self' ${appDomain} http://localhost:8000 http://localhost:3000;`
  )
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
}

export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg|logo.svg|logo.png|robots.txt).*)'],
}
