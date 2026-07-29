/**
 * Cloudinary image storage (payment screenshots + clinic/hospital logos).
 *
 * Only payment screenshots and clinic/hospital logos are stored on Cloudinary.
 * WhatsApp inbound media is never persisted (see webhook handlers).
 *
 * Cloudinary credentials come from CLOUDINARY_URL of the form:
 *   cloudinary://api_key:api_secret@cloud_name
 *
 * If CLOUDINARY_URL is missing (local dev), files fall back to the local
 * ./upload directory so the app still works without cloud storage.
 */
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

let cachedConfig: CloudinaryConfig | null | undefined

function parseCloudinaryUrl(): CloudinaryConfig | null {
  if (cachedConfig !== undefined) return cachedConfig
  const url = process.env.CLOUDINARY_URL
  if (!url || !url.startsWith('cloudinary://')) {
    cachedConfig = null
    return cachedConfig
  }
  try {
    const withoutScheme = url.replace('cloudinary://', '')
    const [auth, cloudName] = withoutScheme.split('@')
    const [apiKey, apiSecret] = auth.split(':')
    if (!apiKey || !apiSecret || !cloudName) {
      cachedConfig = null
      return cachedConfig
    }
    cachedConfig = { cloudName, apiKey, apiSecret }
    return cachedConfig
  } catch {
    cachedConfig = null
    return cachedConfig
  }
}

export function isCloudinaryConfigured(): boolean {
  return parseCloudinaryUrl() !== null
}

/**
 * Upload an image buffer to Cloudinary.
 * @param buffer image bytes
 * @param folder Cloudinary folder (e.g. "clinicai/payment-proofs")
 * @returns secure URL of the uploaded asset
 */
export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  const config = parseCloudinaryUrl()
  if (!config) {
    // Local fallback (dev)
    const uploadDir = path.join(process.cwd(), 'upload')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${folder.replace(/\W+/g, '_')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    await writeFile(path.join(uploadDir, filename), buffer)
    return `/upload/${filename}`
  }

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'image.png')
  form.append('folder', folder)

  const basic = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}` },
      body: form,
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Cloudinary upload failed (${res.status}): ${body}`)
  }
  const data = (await res.json()) as { secure_url?: string }
  if (!data.secure_url) throw new Error('Cloudinary upload returned no secure_url')
  return data.secure_url
}
