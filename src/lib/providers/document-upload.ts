import { resolveDocumentProvider } from '@/lib/providers/registry'

export interface UploadResult {
  providerFileId: string
  storageProvider: 'google' | 'r2'
  webViewLink?: string
}

/**
 * Upload a document to the best available storage.
 * Google Drive if connected → Cloudflare R2 as fallback.
 */
export async function uploadDocument(params: {
  clinicId: string
  name: string
  mimeType: string
  body: Buffer
  patientId?: string
  appointmentId?: string
}): Promise<UploadResult | null> {
  try {
    const { provider, type } = await resolveDocumentProvider(params.clinicId)

    const result = await provider.uploadFile({
      name: params.name,
      mimeType: params.mimeType,
      body: params.body,
      clinicId: params.clinicId,
      patientId: params.patientId,
      appointmentId: params.appointmentId,
    })

    return {
      providerFileId: result.providerFileId,
      storageProvider: type,
      webViewLink: result.webViewLink,
    }
  } catch (e) {
    console.error('[documents] Upload error:', e)

    // If Google Drive fails, fall back to R2
    try {
      const { R2Provider } = await import('@/lib/providers/documents/r2')
      const r2 = new R2Provider()
      const result = await r2.uploadFile({
        name: params.name,
        mimeType: params.mimeType,
        body: params.body,
        clinicId: params.clinicId,
        patientId: params.patientId,
        appointmentId: params.appointmentId,
      })
      return {
        providerFileId: result.providerFileId,
        storageProvider: 'r2',
        webViewLink: result.webViewLink,
      }
    } catch (r2Err) {
      console.error('[documents] R2 fallback also failed:', r2Err)
      return null
    }
  }
}
