import { NextRequest, NextResponse } from 'next/server'
import { processAndUpload, isR2Configured } from '@/lib/image-pipeline'
import { uploadImage } from '@/lib/storage'
import { requireClinicScope } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { clinicId: authClinicId } = await requireClinicScope()
  if (!authClinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const type = (form.get('type') as string) || 'gallery'
    const doctorId = form.get('doctorId') as string | null
    const clinicId = form.get('clinicId') as string || authClinicId

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const validTypes = ['logo', 'hero', 'doctor', 'gallery', 'proof']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10 MB.' }, { status: 400 })
    }

    // Payment proofs go to Cloudinary (with local fallback), like public proofs
    if (type === 'proof') {
      const url = await uploadImage(buffer, 'clinicai/payment-proofs')
      return NextResponse.json({ url })
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'R2 storage not configured' }, { status: 500 })
    }

    const id = doctorId || type
    const result = await processAndUpload(buffer, clinicId, type as 'logo' | 'hero' | 'doctor' | 'gallery', id)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
