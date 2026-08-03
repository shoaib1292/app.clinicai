import sharp from 'sharp'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  })
}

function getR2Bucket(): string {
  return process.env.R2_BUCKET || 'clinicai-images'
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
}

interface ImageVariant {
  width: number
  format: 'webp' | 'avif'
  quality: number
}

const VARIANTS: ImageVariant[] = [
  { width: 100, format: 'webp', quality: 80 },
  { width: 400, format: 'webp', quality: 85 },
  { width: 800, format: 'webp', quality: 85 },
  { width: 1400, format: 'webp', quality: 85 },
  { width: 1400, format: 'avif', quality: 75 },
]

function r2Key(clinicId: string, type: string, id: string, size: string): string {
  return `${clinicId}/${type}/${id}/${size}`
}

async function r2Upload(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!isR2Configured()) {
    const { writeFile, mkdir } = await import('fs/promises')
    const path = await import('path')
    const dir = path.dirname(path.join(process.cwd(), 'upload', key))
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(process.cwd(), 'upload', key), body)
    return
  }
  const client = getR2Client()
  const upload = new Upload({
    client,
    params: {
      Bucket: getR2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    },
  })
  await upload.done()
}

export async function processAndUpload(
  buffer: Buffer,
  clinicId: string,
  type: 'logo' | 'hero' | 'doctor' | 'gallery',
  id: string,
): Promise<{ imageKey: string; urls: Record<string, string> }> {
  const baseKey = `${clinicId}/${type}/${id}`
  const metadata = await sharp(buffer).metadata()
  const publicBase = process.env.R2_PUBLIC_URL || ''

  const original = await sharp(buffer)
    .webp({ quality: 85 })
    .rotate()
    .toBuffer()
  await r2Upload(`${baseKey}/original.webp`, original, 'image/webp')

  const urls: Record<string, string> = {}
  for (const v of VARIANTS) {
    if (v.width > (metadata.width ?? 0)) continue
    const resized = await sharp(buffer)
      .resize(v.width, undefined, { fit: 'inside', withoutEnlargement: true })
      .rotate()
      .toFormat(v.format, { quality: v.quality })
      .toBuffer()
    const sizeKey = `${v.width}.${v.format}`
    await r2Upload(`${baseKey}/${sizeKey}`, resized, `image/${v.format}`)
    urls[v.width] = `${publicBase}/${baseKey}/${sizeKey}`
  }

  return { imageKey: baseKey, urls }
}
