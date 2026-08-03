import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope } from '@/lib/session'
import type { BlockConfig } from '@/components/website/blocks/types'

export async function POST(req: Request) {
  try {
    const { clinicId } = await requireClinicScope()
    const body = await req.json()
    const { blockId, fieldName, value } = body

    if (!blockId || !fieldName || value === undefined || value === null) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: { blocksConfig: true },
    })
    if (!clinic) return NextResponse.json({ ok: false, error: 'Clinic not found' }, { status: 404 })

    let blocks: BlockConfig[] = []
    if (clinic.blocksConfig) {
      try { blocks = JSON.parse(clinic.blocksConfig) } catch { /* keep empty */ }
    }

    // Find or create the block config
    const existingIdx = blocks.findIndex(b => b.blockId === blockId)
    if (existingIdx >= 0) {
      blocks[existingIdx].content = {
        ...blocks[existingIdx].content,
        [fieldName]: value,
      }
    } else {
      blocks.push({
        blockId: blockId as BlockConfig['blockId'],
        order: blocks.length,
        visible: true,
        content: { [fieldName]: value },
      })
    }

    await db.clinic.update({
      where: { id: clinicId },
      data: { blocksConfig: JSON.stringify(blocks) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[blocks/update-content] Error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 500 })
  }
}
