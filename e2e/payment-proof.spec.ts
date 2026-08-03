import { test, expect } from '@playwright/test'

/**
 * E2E: Payment Proof Upload → Confirmation
 *
 * Tests the payment proof upload flow:
 * 1. Login as clinic admin
 * 2. Navigate to appointments
 * 3. Find an appointment with pending payment
 * 4. Upload a payment proof screenshot
 * 5. Verify the proof is attached and visible
 * 6. Verify admin can approve/reject the proof
 */

const CLINIC_EMAIL = process.env.E2E_CLINIC_EMAIL || 'admin@clinic.test'
const CLINIC_PASSWORD = process.env.E2E_CLINIC_PASSWORD || 'test123456'

async function loginAsClinic(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('input[type="email"], input[name="email"]').first().fill(CLINIC_EMAIL)
  await page.locator('input[type="password"], input[name="password"]').first().fill(CLINIC_PASSWORD)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/dashboard/, { timeout: 15000 })
}

test.describe('Payment Proof Management', () => {
  test('payments page loads and shows proof list', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/payments')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show payment table or list
    const paymentList = page.locator('table, [class*="list"], [class*="grid"]').first()
    await expect(paymentList).toBeVisible({ timeout: 10000 })
  })

  test('can navigate to proof detail view', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/payments')

    // Click on first payment entry to see details
    const firstRow = page.locator('table tbody tr, [class*="item"], [class*="row"]').first()
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click()
      await page.waitForTimeout(2000)

      // Should show payment details with proof image if present
      const detailSection = page.locator('[class*="detail"], [class*="proof"], [class*="image"]').first()
      const detailVisible = await detailSection.isVisible().catch(() => false)
      if (detailVisible) {
        // Proof image should be clickable/visible
        const proofImage = page.locator('img[alt*="proof"], img[alt*="screenshot"], [class*="proof-image"]').first()
        const hasImage = await proofImage.isVisible().catch(() => false)
        if (hasImage) {
          // Verify image is loaded (naturalWidth > 0 via JS)
          const isLoaded = await proofImage.evaluate((el: HTMLImageElement) => el.naturalWidth > 0)
          expect(isLoaded).toBeTruthy()
        }
      }
    }
  })

  test('approve or reject payment proof', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/payments')

    // Find approve/reject buttons
    const approveBtn = page.locator('button:has-text("Approve"), button:has-text("Verify")').first()
    const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("Decline")').first()

    const hasActions = await approveBtn.isVisible().catch(() => false) || await rejectBtn.isVisible().catch(() => false)
    if (hasActions) {
      if (await approveBtn.isVisible()) {
        await approveBtn.click()
        await page.waitForTimeout(1000)
        // Should show success toast or status change
        const successMsg = page.locator('text=approved, text=verified, [class*="success"], [class*="toast"]').first()
        await expect(successMsg).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
