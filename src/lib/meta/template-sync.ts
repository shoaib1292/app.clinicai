/**
 * Meta Template Sync — Consolidated module.
 *
 * This file serves TWO distinct sync purposes:
 *
 * 1. MetaTemplateCache sync (meta-template-sync.ts)
 *    - Fetches templates from Meta Graph API v18.0
 *    - Caches them in the MetaTemplateCache table per clinic
 *    - Used by the WhatsApp UI to show available templates
 *    - Exports: syncClinicTemplates(), syncAllClinicTemplates()
 *
 * 2. NotificationTemplate sync (meta-templates.ts)
 *    - Fetches templates from Meta Cloud API v21.0
 *    - Syncs into NotificationTemplate table for Campaign system
 *    - Exports: syncMetaTemplatesToDb(), isMetaTemplateApproved()
 */

import { db } from '../db'
import { decrypt } from '../auth'

// ─── PART 1: MetaTemplateCache sync (v18.0) ───────────────────────────

const META_GRAPH_V18 = 'https://graph.facebook.com/v18.0'

interface TemplateV18 {
  id: string
  name: string
  language: string
  category: string
  status: string
  components: Array<{
    type: string
    text?: string
    format?: string
    example?: Record<string, unknown>
    buttons?: Array<{
      type: string
      text?: string
      url?: string
      phone_number?: string
    }>
  }>
}

async function fetchMetaTemplatesV18(wabaId: string, accessToken: string): Promise<TemplateV18[]> {
  const url = `${META_GRAPH_V18}/${wabaId}/message_templates?limit=50`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Meta API error: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return data.data || []
}

/**
 * Sync Meta templates into MetaTemplateCache for a single clinic.
 * Caches template body/header/footer/buttons for the WhatsApp UI.
 */
export async function syncClinicTemplates(clinicId: string): Promise<{ synced: number; errors: number }> {
  const whatsAppConnections = await db.whatsAppConnection.findMany({
    where: { clinicId, mode: { in: ['meta', 'both'] }, status: 'connected', deletedAt: null },
    include: { clinic: { select: { metaWabaId: true } } },
  })

  let synced = 0
  let errors = 0

  for (const conn of whatsAppConnections) {
    try {
      // Token is stored encrypted on the connection as metaTokenEnc; WABA ID lives on Clinic.metaWabaId.
      const wabaId = conn.clinic?.metaWabaId
      const accessToken = conn.metaTokenEnc ? decrypt(conn.metaTokenEnc) : ''
      if (!wabaId || !accessToken) continue
      const metaTemplates = await fetchMetaTemplatesV18(wabaId, accessToken)

      for (const tpl of metaTemplates) {
        const bodyComponent = tpl.components.find((c) => c.type === 'BODY')
        const headerComponent = tpl.components.find((c) => c.type === 'HEADER')
        const footerComponent = tpl.components.find((c) => c.type === 'FOOTER')
        const buttonComponents = tpl.components.filter((c) => c.type === 'BUTTONS')

        await db.metaTemplateCache.upsert({
          where: { clinicId_name_language: { clinicId, name: tpl.name, language: tpl.language } },
          create: {
            clinicId, wabaId, templateId: tpl.id,
            name: tpl.name, language: tpl.language, category: tpl.category, status: tpl.status,
            body: bodyComponent?.text || '',
            headerType: headerComponent?.type === 'HEADER' ? (headerComponent.format || 'text') : null,
            headerValue: headerComponent?.text || null,
            footerText: footerComponent?.text || null,
            buttons: JSON.stringify(buttonComponents.flatMap((b) => b.buttons || [])),
            lastSyncedAt: new Date(),
          },
          update: {
            templateId: tpl.id, category: tpl.category, status: tpl.status,
            body: bodyComponent?.text || '',
            headerType: headerComponent?.type === 'HEADER' ? (headerComponent.format || 'text') : null,
            headerValue: headerComponent?.text || null,
            footerText: footerComponent?.text || null,
            buttons: JSON.stringify(buttonComponents.flatMap((b) => b.buttons || [])),
            lastSyncedAt: new Date(),
          },
        })
        synced++
      }
    } catch (err) {
      console.error(`[MetaTemplateSync] Clinic ${clinicId}:`, err)
      errors++
    }
  }

  return { synced, errors }
}

/**
 * Sync Meta templates into MetaTemplateCache for ALL clinics with active Meta connections.
 */
export async function syncAllClinicTemplates(): Promise<{ total: number; errors: number }> {
  const connections = await db.whatsAppConnection.findMany({
    where: { mode: { in: ['meta', 'both'] }, status: 'connected', deletedAt: null },
    select: { clinicId: true },
    distinct: ['clinicId'],
  })

  let total = 0
  let errors = 0
  for (const { clinicId } of connections) {
    const result = await syncClinicTemplates(clinicId)
    total += result.synced
    errors += result.errors
  }
  return { total, errors }
}

// ─── PART 2: NotificationTemplate sync (v21.0) ────────────────────────

const META_GRAPH_V21 = 'https://graph.facebook.com/v21.0'

export interface MetaTemplateV21 {
  id: string
  name: string
  language: string
  status: string
  category: string
  components: Array<{
    type: string
    text?: string
    example?: { body_text?: string[] }
  }>
}

/**
 * Fetch templates from Meta Cloud API v21.0 for a WABA ID.
 */
export async function fetchMetaTemplates(wabaId: string, accessToken: string): Promise<MetaTemplateV21[]> {
  const url = `${META_GRAPH_V21}/${wabaId}/message_templates?fields=id,name,language,status,category,components`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Meta API error fetching templates: ${res.status} ${errBody}`)
  }
  const data = await res.json()
  return data.data || []
}

/**
 * Sync Meta templates into the clinic's NotificationTemplate table.
 * Used by the Campaign system to offer template-based messages.
 */
export async function syncMetaTemplatesToDb(
  clinicId: string,
  wabaId: string,
  accessToken: string
): Promise<{ added: number; updated: number }> {
  const templates = await fetchMetaTemplates(wabaId, accessToken)

  let added = 0
  let updated = 0

  for (const tpl of templates) {
    const bodyComponent = tpl.components.find((c) => c.type === 'BODY')
    const bodyText = bodyComponent?.text || ''

    const existing = await db.notificationTemplate.findFirst({
      where: { clinicId, triggerEvent: `meta_template:${tpl.name}` },
    })

    if (existing) {
      await db.notificationTemplate.update({
        where: { id: existing.id },
        data: { bodyTemplate: bodyText, language: tpl.language },
      })
      updated++
    } else {
      await db.notificationTemplate.create({
        data: {
          clinicId, channel: 'whatsapp',
          triggerEvent: `meta_template:${tpl.name}`,
          bodyTemplate: bodyText, language: tpl.language || 'urdu',
          modality: 'text', enabled: tpl.status === 'APPROVED',
        },
      })
      added++
    }
  }

  return { added, updated }
}

/**
 * Check if a specific Meta template name is approved and ready for use.
 */
export async function isMetaTemplateApproved(
  wabaId: string,
  accessToken: string,
  templateName: string
): Promise<boolean> {
  try {
    const templates = await fetchMetaTemplates(wabaId, accessToken)
    const tpl = templates.find((t) => t.name === templateName)
    return tpl?.status === 'APPROVED'
  } catch {
    return false
  }
}
