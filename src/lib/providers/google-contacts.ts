import { google } from 'googleapis'
import { getOAuth2Client } from '@/lib/google-token-manager'
import { db } from '@/lib/db'

export interface ContactToSync {
  name: string
  phone: string
  email?: string
  type: 'patient' | 'doctor' | 'staff'
  clinicId: string
}

export interface SyncResult {
  synced: number
  errors: number
  details: string[]
}

/**
 * Sync clinic contacts (patients, doctors, staff) to Google Contacts.
 * Creates/updates contacts under a "ClinicAI" group/label.
 */
export async function syncContacts(
  connectionId: string,
  clinicId: string,
  contacts: ContactToSync[],
): Promise<SyncResult> {
  const auth = await getOAuth2Client(connectionId)
  if (!auth) throw new Error('GOOGLE_AUTH_FAILED')

  const people = google.people({ version: 'v1', auth })
  const result: SyncResult = { synced: 0, errors: 0, details: [] }

  for (const contact of contacts) {
    try {
      const names: Array<{ givenName?: string; familyName?: string }> = []
      const nameParts = contact.name.split(' ')
      if (nameParts.length === 1) {
        names.push({ givenName: nameParts[0] })
      } else {
        names.push({ givenName: nameParts[0], familyName: nameParts.slice(1).join(' ') })
      }

      const contactData: Record<string, unknown> = {
        names,
        phoneNumbers: [{ value: contact.phone }],
        emailAddresses: contact.email ? [{ value: contact.email }] : undefined,
        userDefined: [
          { key: 'type', value: contact.type },
          { key: 'clinic', value: contact.clinicId },
        ],
      }

      // Check if contact already exists (search by phone)
      const existing = await people.people.searchContacts({
        query: contact.phone,
        readMask: 'names,phoneNumbers,emailAddresses',
      })

      if (existing.data.results?.length) {
        // Update existing
        const resourceName = existing.data.results[0].person?.resourceName
        if (resourceName) {
          await people.people.updateContact({
            resourceName,
            updatePersonFields: 'names,phoneNumbers,emailAddresses,userDefined',
            requestBody: contactData,
          })
          result.details.push(`Updated: ${contact.name}`)
        }
      } else {
        // Create new
        await people.people.createContact({
          requestBody: contactData,
        })
        result.details.push(`Created: ${contact.name}`)
      }
      result.synced++
    } catch (err) {
      result.errors++
      result.details.push(`Error: ${contact.name} — ${String(err)}`)
      console.error(`[contacts] Failed to sync ${contact.name}:`, err)
    }
  }

  await db.googleAuditLog.create({
    data: {
      clinicId,
      connectionId,
      action: 'contacts_synced',
      metadata: JSON.stringify({ synced: result.synced, errors: result.errors }),
    },
  })

  return result
}

/**
 * Build contact list from clinic's database for syncing.
 */
export async function getClinicContacts(clinicId: string): Promise<ContactToSync[]> {
  const contacts: ContactToSync[] = []

  const patients = await db.patient.findMany({
    where: { clinicId, deletedAt: null },
    select: { name: true, phone: true, email: true },
    take: 200,
  })

  for (const p of patients) {
    if (p.name && p.phone) {
      contacts.push({ name: p.name, phone: p.phone, email: p.email || undefined, type: 'patient', clinicId })
    }
  }

  const doctors = await db.doctor.findMany({
    where: { clinicId, deletedAt: null, active: true },
    select: { name: true, phone: true, email: true },
  })

  for (const d of doctors) {
    if (d.phone) {
      contacts.push({ name: d.name, phone: d.phone, email: d.email || undefined, type: 'doctor', clinicId })
    }
  }

  const staff = await db.receptionist.findMany({
    where: { clinicId, deletedAt: null, active: true },
    select: { name: true, phone: true, email: true },
  })

  for (const s of staff) {
    if (s.phone) {
      contacts.push({ name: s.name, phone: s.phone, email: s.email || undefined, type: 'staff', clinicId })
    }
  }

  return contacts
}
