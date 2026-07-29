import { NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'
import { ok, handle } from '@/lib/api'

async function logout(_req: NextRequest) {
  const res = ok({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}

export const POST = handle(logout)
