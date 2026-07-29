/**
 * VLM Payment Screenshot Analysis (Founder Doc improvement)
 * Uses z-ai-web-dev-sdk VLM to analyze payment screenshots for:
 * - Detecting amount, date, recipient from the screenshot
 * - Flagging suspicious/fake screenshots for manual review
 * - Extracting transaction reference numbers
 *
 * This helps finance staff verify payment proofs faster and catches fakes.
 */
import ZAI from 'z-ai-web-dev-sdk'

export interface PaymentScreenshotAnalysis {
  detected: boolean
  amount?: number
  currency?: string
  date?: string
  recipientName?: string
  recipientAccount?: string
  transactionId?: string
  senderName?: string
  bankOrWallet?: string
  suspiciousFlags: string[]
  confidence: number // 0-1
  rawAnalysis: string
}

/**
 * Analyze a payment screenshot using VLM.
 * @param imageUrl - URL or base64 data URL of the screenshot
 */
export async function analyzePaymentScreenshot(imageUrl: string): Promise<PaymentScreenshotAnalysis> {
  const zai = await ZAI.create()

  const prompt = `Analyze this payment screenshot and extract the following information.
Return your response as JSON with these fields:
- detected: true if this appears to be a payment/bank transfer screenshot, false otherwise
- amount: the payment amount as a number (null if not found)
- currency: currency code (e.g., "PKR", "USD")
- date: payment date as shown in screenshot
- recipientName: name of the recipient/account holder
- recipientAccount: account number or wallet number (last 4 digits only for security)
- transactionId: transaction reference number
- senderName: sender's name if visible
- bankOrWallet: bank name or wallet type (e.g., "Meezan Bank", "Easypaisa", "JazzCash")
- suspiciousFlags: array of strings noting anything suspicious (e.g., "inconsistent amounts", "blurry", "edited metadata", "mismatched dates")
- confidence: your confidence score 0-1

Only include fields you can clearly see. Be conservative — if something is unclear, omit it rather than guessing.`

  try {
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const content = response.choices[0]?.message?.content || ''

    // Try to parse as JSON
    let parsed: Partial<PaymentScreenshotAnalysis> = {}
    try {
      // Strip markdown code fences if present
      const cleanContent = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleanContent)
    } catch {
      // If JSON parsing fails, try to extract key fields from text
      parsed = extractFromText(content)
    }

    return {
      detected: parsed.detected ?? false,
      amount: parsed.amount,
      currency: parsed.currency,
      date: parsed.date,
      recipientName: parsed.recipientName,
      recipientAccount: parsed.recipientAccount,
      transactionId: parsed.transactionId,
      senderName: parsed.senderName,
      bankOrWallet: parsed.bankOrWallet,
      suspiciousFlags: parsed.suspiciousFlags || [],
      confidence: parsed.confidence ?? 0.5,
      rawAnalysis: content,
    }
  } catch (err) {
    console.error('[vlm:payment] Analysis error:', err)
    return {
      detected: false,
      suspiciousFlags: ['analysis_failed'],
      confidence: 0,
      rawAnalysis: String(err),
    }
  }
}

/**
 * Fallback: extract payment info from unstructured text response.
 */
function extractFromText(text: string): Partial<PaymentScreenshotAnalysis> {
  const result: Partial<PaymentScreenshotAnalysis> = { suspiciousFlags: [] }

  // Amount
  const amountMatch = text.match(/(?:amount|rs|pkr)\s*[:\-]?\s*(\d[\d,]*)/i)
  if (amountMatch) {
    result.amount = parseInt(amountMatch[1].replace(/,/g, ''))
    result.currency = 'PKR'
  }

  // Date
  const dateMatch = text.match(/(?:date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (dateMatch) result.date = dateMatch[1]

  // Transaction ID
  const txnMatch = text.match(/(?:transaction|txn|ref)\s*(?:id|no|number)?\s*[:\-]?\s*([A-Z0-9]{8,})/i)
  if (txnMatch) result.transactionId = txnMatch[1]

  // Bank/wallet
  const bankMatch = text.match(/(?:meezan|hbl|ubl|bank|easypaisa|jazzcash|nayapay)/i)
  if (bankMatch) result.bankOrWallet = bankMatch[0]

  return result
}

/**
 * Check if a payment screenshot matches the expected appointment fee.
 * Returns flags if there are discrepancies.
 */
export function validatePaymentMatch(
  analysis: PaymentScreenshotAnalysis,
  expectedAmount: number,
  expectedBankName?: string
): { valid: boolean; flags: string[] } {
  const flags: string[] = []

  if (!analysis.detected) {
    flags.push('not_a_payment_screenshot')
    return { valid: false, flags }
  }

  if (analysis.amount !== undefined && analysis.amount !== expectedAmount) {
    flags.push(`amount_mismatch: expected ${expectedAmount}, detected ${analysis.amount}`)
  }

  if (expectedBankName && analysis.bankOrWallet) {
    const expected = expectedBankName.toLowerCase()
    const detected = analysis.bankOrWallet.toLowerCase()
    if (!detected.includes(expected) && !expected.includes(detected)) {
      flags.push(`bank_mismatch: expected ${expectedBankName}, detected ${analysis.bankOrWallet}`)
    }
  }

  if (analysis.confidence < 0.5) {
    flags.push('low_confidence_analysis')
  }

  // Add suspicious flags from analysis
  flags.push(...analysis.suspiciousFlags)

  return { valid: flags.length === 0, flags }
}
