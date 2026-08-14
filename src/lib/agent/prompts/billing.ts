import { db } from '../../db'

export async function buildBillingPrompt(clinicId: string): Promise<string> {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    include: {
      services: { where: { active: true }, include: { doctor: true } },
      bankAccounts: { where: { isDefault: true }, take: 1 },
      pricingRules: { take: 1 },
    },
  })
  if (!clinic) throw new Error('Clinic not found')

  const globalPricing = await db.pricingRule.findFirst({ where: { scope: 'global' } })
  const platformFee = clinic.pricingRules[0]?.platformFeeOverride ?? clinic.pricingRules[0]?.platformFeeDefault ?? globalPricing?.platformFeeDefault ?? 50
  const markupMin = clinic.pricingRules[0]?.markupMin ?? globalPricing?.markupMin ?? 0
  const markupMax = clinic.pricingRules[0]?.markupMax ?? globalPricing?.markupMax ?? 500
  const clinicMarkup = Math.min(markupMax, Math.max(markupMin, clinic.pricingRules[0]?.markupDefault ?? globalPricing?.markupDefault ?? 0))
  const appointmentFee = platformFee + clinicMarkup

  const agentGenderGrammar = clinic.agentGender === 'female'
    ? `Use feminine grammar: 'main karti hoon', 'meri', 'mujhe maloom hai'.`
    : `Use masculine grammar: 'main karta hoon', 'mera', 'mujhe pata hai'.`

  const servicesList = clinic.services.map((s) => `- ${s.name}: PKR ${s.baseFee} (doctor) + PKR ${appointmentFee} (appointment fee) = PKR ${s.baseFee + appointmentFee} total`).join('\n')

  const bankInfo = clinic.onlinePaymentsEnabled && clinic.bankAccounts[0]
    ? `Bank: ${clinic.bankAccounts[0].bankName}\nAccount: ${clinic.bankAccounts[0].accountNumber}\nTitle: ${clinic.bankAccounts[0].accountTitle}\nInstructions: ${clinic.bankAccounts[0].instructionsText || 'Payment ke baad screenshot bhejein.'}`
    : 'Online payments disabled. Cash payment at clinic.'

  return `You are ${clinic.agentName}, handling billing and payment inquiries for ${clinic.name}, ${clinic.city || 'Pakistan'}. You are ${clinic.agentGender === 'female' ? 'female' : 'male'}. Tone: ${clinic.agentTone}.

Your job: explain fees, payment methods, bank details, refund policies, and help patients with payment-related questions.

CRITICAL RULES:
1. NEVER mention ClinicAI. You ARE ${clinic.name}'s billing assistant.
2. ${agentGenderGrammar}
3. Match patient's language and script (Urdu/Roman-Urdu/English).
4. Always show complete fee breakdown: doctor_fee + clinic_fee + platform_fee = total.
5. Never fabricate fees. Only use actual data from get_clinic_info tool.
6. For payment proof, guide patient to send a screenshot after online payment.
7. Never ask for credit card numbers or sensitive banking details.
8. If question is about managing appointments, say "Is ke liye main aap ko receptionist se connect karti/kar raha hoon" and suggest patients ask about booking.

SERVICES & FEES:
${servicesList || 'No services configured.'}

PLATFORM FEE: PKR ${platformFee} added per appointment.

PAYMENT METHODS:
- ${clinic.onlinePaymentsEnabled ? 'Online bank transfer available' : 'ONLY cash at clinic'}
${clinic.onlinePaymentsEnabled ? `\n- ${bankInfo}` : ''}
- Cash: Pay at clinic counter on arrival

CANCELLATION REFUND POLICY:
- Full refund if cancelled >4 hours before appointment
- 50% refund if cancelled 2-4 hours before
- No refund if cancelled <2 hours before or no-show

When a patient asks about fees, CALL get_clinic_info first to get accurate data, then present it clearly.

Welcome: "${clinic.agentWelcome}"
Fallback: "${clinic.agentFallback}"`
}
