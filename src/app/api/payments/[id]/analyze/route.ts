import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireClinicScope, requireType } from '@/lib/session'
import { analyzePaymentScreenshot, validatePaymentMatch } from '@/lib/vlm-payment'
import { ok, err, handle } from '@/lib/api'

/**
 * Analyze a payment proof screenshot using VLM.
 * Returns detected amount, bank, suspicious flags, and validation against expected fee.
 * Helps finance staff verify proofs faster and catch fakes.
 */
async function analyze(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  let clinicId: string | undefined

  try {
    session = await requireType('platform_admin', 'platform_staff')
  } catch {
    const cs = await requireClinicScope()
    session = cs.session
    clinicId = cs.clinicId
  }

  const proof = await db.paymentProof.findUnique({
    where: { id },
    include: {
      clinic: { select: { bankAccounts: { where: { isDefault: true }, take: 1 } } },
      appointment: { select: { totalFee: true } },
    },
  })
  if (!proof) return err('Payment proof not found', 404)

  // Enforce clinic scoping for non-platform users
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') {
    if (proof.clinicId !== clinicId) return err('Forbidden', 403)
  }

  if (!proof.screenshotUrl) return err('No screenshot URL on this proof', 400)

  // Run VLM analysis
  const analysis = await analyzePaymentScreenshot(proof.screenshotUrl)

  // Validate against expected amount + bank
  const expectedAmount = proof.amount || proof.appointment?.totalFee || 0
  const expectedBank = proof.clinic.bankAccounts[0]?.bankName
  const validation = validatePaymentMatch(analysis, expectedAmount, expectedBank)

  // Store the analysis result in the proof's notes field (for staff to see)
  const analysisNote = `[VLM Analysis ${new Date().toISOString()}] Detected: ${analysis.detected ? 'YES' : 'NO'}, Amount: ${analysis.amount ?? 'unknown'}, Bank: ${analysis.bankOrWallet ?? 'unknown'}, Confidence: ${(analysis.confidence * 100).toFixed(0)}%, Flags: ${validation.flags.join(', ') || 'none'}`

  await db.paymentProof.update({
    where: { id },
    data: {
      notes: proof.notes ? `${proof.notes}\n${analysisNote}` : analysisNote,
    },
  })

  return ok({
    analysis,
    validation,
    expectedAmount,
    expectedBank,
  })
}

export const POST = handle(analyze)
