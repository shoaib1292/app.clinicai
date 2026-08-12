import { google, drive_v3 } from 'googleapis'
import { getOAuth2Client } from '@/lib/google-token-manager'
import { db } from '@/lib/db'
import type { DocumentProvider, UploadParams, DocumentResult, ListFilesQuery } from '../types'

export class GoogleDriveProvider implements DocumentProvider {
  constructor(private connectionId: string, private clinicId: string) {}

  private async getDrive() {
    const auth = await getOAuth2Client(this.connectionId)
    if (!auth) throw new Error('GOOGLE_AUTH_FAILED')
    return google.drive({ version: 'v3', auth })
  }

  async uploadFile(params: UploadParams): Promise<DocumentResult> {
    const drive = await this.getDrive()

    // Auto-create folder structure if needed
    let parentFolderId = params.folderId
    if (!parentFolderId) {
      parentFolderId = await this.ensureFolderStructure(params.patientId)
    }

    const res = await drive.files.create({
      requestBody: {
        name: params.name,
        mimeType: params.mimeType,
        parents: parentFolderId ? [parentFolderId] : undefined,
      },
      media: {
        mimeType: params.mimeType,
        body: params.body,
      },
      fields: 'id,name,mimeType,webViewLink,size,parents',
    })

    const file = res.data
    if (!file.id) throw new Error('Drive returned no file ID')

    // Store in local DB
    await db.googleDriveFile.create({
      data: {
        id: file.id,
        connectionId: this.connectionId,
        clinicId: this.clinicId,
        patientId: params.patientId,
        appointmentId: params.appointmentId,
        name: file.name || params.name,
        mimeType: file.mimeType || params.mimeType,
        folderId: parentFolderId,
        webViewLink: file.webViewLink || undefined,
        size: file.size ? BigInt(file.size) : undefined,
      },
    })

    await db.googleAuditLog.create({
      data: {
        clinicId: this.clinicId,
        connectionId: this.connectionId,
        action: 'drive_upload',
        metadata: JSON.stringify({ fileId: file.id, name: params.name, patientId: params.patientId }),
      },
    })

    return {
      providerFileId: file.id,
      name: file.name || params.name,
      mimeType: file.mimeType || params.mimeType,
      webViewLink: file.webViewLink || undefined,
      folderId: parentFolderId,
      size: file.size ? Number(file.size) : undefined,
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const drive = await this.getDrive()
    try {
      await drive.files.delete({ fileId })
    } catch (e: unknown) {
      if ((e as { code?: number }).code !== 404) throw e
    }

    await db.googleDriveFile.delete({ where: { id: fileId } })
    await db.googleAuditLog.create({
      data: {
        clinicId: this.clinicId,
        connectionId: this.connectionId,
        action: 'drive_delete',
        metadata: JSON.stringify({ fileId }),
      },
    })
  }

  async getFile(fileId: string): Promise<DocumentResult | null> {
    const drive = await this.getDrive()
    try {
      const res = await drive.files.get({ fileId, fields: 'id,name,mimeType,webViewLink,size,parents' })
      const f = res.data
      if (!f.id) return null
      return {
        providerFileId: f.id,
        name: f.name || '',
        mimeType: f.mimeType || '',
        webViewLink: f.webViewLink || undefined,
        folderId: f.parents?.[0],
        size: f.size ? Number(f.size) : undefined,
      }
    } catch {
      return null
    }
  }

  async listFiles(query: ListFilesQuery): Promise<DocumentResult[]> {
    const drive = await this.getDrive()

    const q: string[] = [`'me' in owners`]
    if (query.folderId) q.push(`'${query.folderId}' in parents`)
    if (query.nameContains) q.push(`name contains '${query.nameContains}'`)

    const res = await drive.files.list({
      q: q.join(' and '),
      pageSize: query.limit || 50,
      fields: 'files(id,name,mimeType,webViewLink,size,parents)',
    })

    return (res.data.files || []).map(f => ({
      providerFileId: f.id || '',
      name: f.name || '',
      mimeType: f.mimeType || '',
      webViewLink: f.webViewLink || undefined,
      folderId: f.parents?.[0],
      size: f.size ? Number(f.size) : undefined,
    }))
  }

  async createFolder(name: string, parentId?: string): Promise<DocumentResult> {
    const drive = await this.getDrive()

    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id,name,mimeType,parents',
    })

    const folder = res.data
    return {
      providerFileId: folder.id || '',
      name: folder.name || name,
      mimeType: 'application/vnd.google-apps.folder',
      folderId: folder.parents?.[0],
    }
  }

  /**
   * Ensure /ClinicAI/Patients/{patientName}/ folder structure exists.
   * Creates folders only if they don't exist. Idempotent.
   */
  private async ensureFolderStructure(patientId?: string): Promise<string | undefined> {
    // Check if root folder already stored
    const connection = await db.googleConnection.findUnique({
      where: { id: this.connectionId },
      select: { driveRootFolderId: true, drivePatientsFolderId: true },
    })

    let rootId = connection?.driveRootFolderId
    let patientsId = connection?.drivePatientsFolderId

    if (!rootId) {
      const root = await this.createFolder('ClinicAI')
      rootId = root.providerFileId
      await db.googleConnection.update({
        where: { id: this.connectionId },
        data: { driveRootFolderId: rootId },
      })
    }

    if (!patientsId) {
      const patients = await this.createFolder('Patients', rootId)
      patientsId = patients.providerFileId
      await db.googleConnection.update({
        where: { id: this.connectionId },
        data: { drivePatientsFolderId: patientsId },
      })
    }

    if (patientId) {
      // Get patient name for folder
      const patient = await db.patient.findUnique({
        where: { id: patientId },
        select: { name: true },
      })

      if (patient?.name) {
        // Check if patient folder already exists
        const existingFiles = await this.listFiles({
          folderId: patientsId,
          nameContains: patient.name,
          limit: 1,
        })

        if (existingFiles.length > 0) {
          return existingFiles[0].providerFileId
        }

        const patientFolder = await this.createFolder(patient.name, patientsId)
        return patientFolder.providerFileId
      }
    }

    return patientsId
  }
}
