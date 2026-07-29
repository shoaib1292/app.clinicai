import { NextResponse } from 'next/server'

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function err(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status })
}

export function unauthorized() {
  return err('Unauthorized', 401)
}

export function forbidden() {
  return err('Forbidden', 403)
}

export function notFound(msg = 'Not found') {
  return err(msg, 404)
}

// Wrap an async route handler with error boundary
export function handle<T extends unknown[]>(
  fn: (...args: T) => Promise<unknown>
) {
  return async (...args: T) => {
    try {
      const result = await fn(...args)
      return result as unknown as NextResponse
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Internal error'
      if (msg === 'UNAUTHORIZED') return unauthorized()
      if (msg === 'FORBIDDEN') return forbidden()
      if (msg === 'NO_CLINIC') return err('No clinic context', 403)
      console.error('API error', e)
      return err(msg, 500)
    }
  }
}
