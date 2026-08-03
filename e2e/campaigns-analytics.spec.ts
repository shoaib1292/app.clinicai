import { test, expect } from '@playwright/test'

/**
 * E2E: Campaigns & Analytics
 *
 * Tests marketing campaigns and analytics dashboard:
 * 1. Navigate to campaigns list
 * 2. Create a new campaign
 * 3. View campaign analytics
 * 4. Navigate to analytics dashboard
 * 5. Verify charts and metrics load
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

test.describe('Campaigns Management', () => {
  test('campaigns page loads with list', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/campaigns')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show campaign list or empty state
    const campaignList = page.locator('table, [class*="list"], [class*="empty"]').first()
    await expect(campaignList).toBeVisible({ timeout: 10000 })
  })

  test('can open create campaign form', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/campaigns')

    const addBtn = page.locator('button:has-text("New Campaign"), button:has-text("Create Campaign"), button:has-text("Add Campaign")').first()
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1000)

      // Should show form
      const form = page.locator('form, [role="dialog"], [class*="dialog"], [class*="modal"]').first()
      await expect(form).toBeVisible({ timeout: 5000 })

      // Fill campaign name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(`E2E Campaign ${Date.now()}`)
      }

      // Close or submit
      const cancelBtn = page.locator('button:has-text("Cancel"), [aria-label*="close" i]').first()
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click()
      }
    }
  })

  test('can view campaign analytics page', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/campaigns')

    // Click on first campaign to see analytics if exists
    const firstCampaign = page.locator('table tbody tr, a[href*="/dashboard/clinic/campaigns/"]').first()
    if (await firstCampaign.isVisible().catch(() => false)) {
      await firstCampaign.click()
      await page.waitForTimeout(2000)

      // Should show campaign detail or analytics
      const detail = page.locator('h1, .campaign-name, [class*="detail"]').first()
      await expect(detail).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Analytics Dashboard', () => {
  test('analytics page loads with charts', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/analytics')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should have charts or stat cards
    const charts = page.locator('[class*="chart"], [class*="recharts"], svg, canvas, [class*="stat"], [class*="metric"]').first()
    await expect(charts).toBeVisible({ timeout: 10000 })
  })

  test('advanced analytics page is accessible', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/analytics')

    // Look for advanced tab or link
    const advancedLink = page.locator('[role="tab"]:has-text("Advanced"), a:has-text("Advanced"), button:has-text("Advanced")').first()
    if (await advancedLink.isVisible().catch(() => false)) {
      await advancedLink.click()
      await page.waitForTimeout(2000)

      // Should show advanced analytics content
      const content = page.locator('[class*="forecast"], [class*="churn"], [class*="cohort"], [class*="advanced"]').first()
      await expect(content).toBeVisible({ timeout: 5000 })
    }
  })

  test('doctor performance page loads', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/doctor-performance')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show performance charts or table
    const content = page.locator('[class*="chart"], [class*="table"], [class*="performance"]').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })
})
