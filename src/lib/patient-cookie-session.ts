import { cookies } from 'next/headers'
import { createPatientSession, verifyPatientToken, type PatientPayload } from './patient-session'

export const PATIENT_SESSION_COOKIE = 'clinicsai_patient'

export async function setPatientCookie(token: string) {
  const store = await cookies()
  const payload = await verifyPatientToken(token)
  store.set(PATIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 3600,
  })
  return payload
}

export async function getPatientFromCookie(): Promise<PatientPayload | null> {
  const store = await cookies()
  const token = store.get(PATIENT_SESSION_COOKIE)?.value
  if (!token) return null
  try {
    return await verifyPatientToken(token)
  } catch {
    return null
  }
}

export async function requirePatientCookie(): Promise<PatientPayload> {
  const payload = await getPatientFromCookie()
  if (!payload) throw new Error('UNAUTHORIZED')
  return payload
}

export async function clearPatientCookie() {
  const store = await cookies()
  store.delete(PATIENT_SESSION_COOKIE)
}

export async function createAndSetPatientCookie(appUserId: string, phoneHash: string): Promise<PatientPayload> {
  const token = await createPatientSession(appUserId, phoneHash)
  return setPatientCookie(token)
}
