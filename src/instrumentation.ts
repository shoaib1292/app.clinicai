import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')

    // Boot guard: fail fast if production secrets are missing.
    // (auth.ts also throws at module load, this is defense-in-depth + clear message.)
    if (process.env.NODE_ENV === 'production') {
      const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'APP_ENCRYPTION_KEY', 'PHONE_HASH_SALT']
      const missing = required.filter((k) => !process.env[k])
      if (missing.length) {
        throw new Error(`Missing required env vars in production: ${missing.join(', ')}`)
      }
    }

    // Ensure platform admin exists (sourced from PLATFORM_ADMIN_EMAIL/PASSWORD).
    try {
      const { ensurePlatformAdmin } = await import('@/lib/ensure-platform-admin')
      await ensurePlatformAdmin()
    } catch (e) {
      console.error('[boot] ensurePlatformAdmin failed:', e)
    }

    // Backfill starter marketing posts into the shared blog table.
    try {
      const { ensureStarterBlogPosts } = await import('@/lib/ensure-blog-posts')
      await ensureStarterBlogPosts()
    } catch (e) {
      console.error('[boot] ensureStarterBlogPosts failed:', e)
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
