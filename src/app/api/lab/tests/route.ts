import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'

async function listTests(req: NextRequest) {
  const { clinicId } = await requireClinicScope()
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const activeOnly = url.searchParams.get('active') !== 'false'

  const tests = await db.labTest.findMany({
    where: { clinicId, ...(category ? { category } : {}), isActive: activeOnly },
    orderBy: { name: 'asc' },
  })
  return ok(tests)
}

async function createTest(req: NextRequest) {
  const { clinicId, session } = await requireClinicScope()
  const body = await req.json() as { name: string; category?: string; price: number; turnaroundHrs?: number; specimenType?: string; description?: string }

  if (!body.name || !body.price) return err('name and price are required', 400)

  const existing = await db.labTest.findUnique({ where: { clinicId_name: { clinicId, name: body.name.trim() } } })
  if (existing) return err('Test with this name already exists', 409)

  const test = await db.labTest.create({
    data: {
      clinicId,
      name: body.name.trim(),
      category: body.category || 'general',
      price: body.price,
      turnaroundHrs: body.turnaroundHrs ?? 24,
      specimenType: body.specimenType || null,
      description: body.description || null,
    },
  })
  await auditLog({ actorId: session.sub, actorType: session.type, clinicId, action: 'lab_test_created', target: test.id })
  return ok(test)
}

export const GET = handle(listTests)
export const POST = handle(createTest)
