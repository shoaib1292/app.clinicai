import type { DocumentProvider, UploadParams, DocumentResult, ListFilesQuery } from '../types'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'

export class R2Provider implements DocumentProvider {
  private getClient(): S3Client {
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

  private getBucket(): string {
    return process.env.R2_BUCKET || 'clinicai-images'
  }

  private isConfigured(): boolean {
    return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
  }

  private r2Key(params: UploadParams): string {
    const parts = [params.clinicId, 'docs']
    if (params.patientId) parts.push(params.patientId)
    parts.push(`${Date.now()}-${params.name}`)
    return parts.join('/')
  }

  async uploadFile(params: UploadParams): Promise<DocumentResult> {
    if (!this.isConfigured()) {
      const { writeFile, mkdir } = await import('fs/promises')
      const path = await import('path')
      const key = this.r2Key(params)
      const filePath = path.join(process.cwd(), 'upload', key)
      const dir = path.dirname(filePath)
      await mkdir(dir, { recursive: true })
      await writeFile(filePath, params.body)
      return { providerFileId: key, name: params.name, mimeType: params.mimeType }
    }

    const key = this.r2Key(params)
    const client = this.getClient()

    const upload = new Upload({
      client,
      params: {
        Bucket: this.getBucket(),
        Key: key,
        Body: params.body,
        ContentType: params.mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      },
    })
    await upload.done()

    return { providerFileId: key, name: params.name, mimeType: params.mimeType }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.isConfigured()) return
    const client = this.getClient()
    await client.send(new DeleteObjectCommand({
      Bucket: this.getBucket(),
      Key: fileId,
    }))
  }

  async getFile(_fileId: string): Promise<DocumentResult | null> {
    return null
  }

  async listFiles(_query: ListFilesQuery): Promise<DocumentResult[]> {
    return []
  }

  async createFolder(_name: string, _parentId?: string): Promise<DocumentResult> {
    return { providerFileId: '', name: '', mimeType: '' }
  }
}
