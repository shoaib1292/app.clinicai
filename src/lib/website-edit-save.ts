'use client'

export async function saveBlockContent(
  blockId: string,
  fieldName: string,
  value: string,
): Promise<boolean> {
  try {
    const slug = getClinicSlugFromHost()
    if (!slug) {
      console.warn('[EditableText] Could not determine clinic slug from hostname')
      return false
    }

    const res = await fetch(`/api/website/blocks/update-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, blockId, fieldName, value }),
    })
    const json = await res.json()
    return json.ok
  } catch (err) {
    console.error('[EditableText] Save failed:', err)
    return false
  }
}

function getClinicSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname
  // Handle subdomain: slug.clinicai.pk
  if (host.endsWith('.clinicai.pk')) {
    return host.replace('.clinicai.pk', '')
  }
  // Handle custom domain or localhost
  if (host === 'localhost' || host.startsWith('127.')) {
    const pathSlug = window.location.pathname.match(/\/website\/([^/]+)/)
    if (pathSlug) return pathSlug[1]
  }
  return null
}
