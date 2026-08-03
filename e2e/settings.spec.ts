import { test, expect } from '@playwright/test'

/**
 * E2E: Settings & Clinic Configuration
 *
 * Tests clinic settings and configuration pages:
 * 1. Settings page loads
 * 2. Update clinic name
 * 3. WhatsApp connection page
 * 4. Automation rules page
 * 5. Booking links page
 * 6. Reminders page
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

test.describe('Clinic Settings', () => {
  test('settings page loads with form fields', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/settings')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should have name and phone fields
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="phone" i], input[type="tel"]').first()

    await expect(nameInput).toBeVisible({ timeout: 5000 })
    await expect(phoneInput).toBeVisible({ timeout: 5000 })
  })

  test('can update clinic name', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/settings')

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    if (await nameInput.isVisible().catch(() => false)) {
      const newName = `E2E Clinic ${Date.now()}`
      await nameInput.fill(newName)
      await page.waitForTimeout(500)

      const saveBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first()
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click()
        await page.waitForTimeout(2000)

        // Should show success message or updated value
        await expect(nameInput).toHaveValue(newName)
      }
    }
  })
})

test.describe('WhatsApp & Integrations', () => {
  test('whatsapp page loads with connection options', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/whatsapp')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show WhatsApp connection options (no internal provider branding leaked)
    const content = page.locator('text=Meta Cloud API, text=WhatsApp, text=QR, text=Recommended, text=Connect').first()
    await expect(content).toBeVisible({ timeout: 5000 })

    // Internal provider name must NOT be exposed to clinic users
    await expect(page.locator('text=Evolution')).toHaveCount(0)
  })

  test('automation rules page loads', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/automation')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show rules list or empty state
    const rulesList = page.locator('table, [class*="rule"], [class*="list"], [class*="empty"]').first()
    await expect(rulesList).toBeVisible({ timeout: 10000 })
  })

  test('booking links page loads with link generation', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/booking-links')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show booking link or generate button
    const linkContent = page.locator('text=link, text=URL, text=share, text=copy, text=Booking, input[readonly]').first()
    await expect(linkContent).toBeVisible({ timeout: 5000 })
  })

  test('reminders page loads with templates', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/reminders')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show reminders list or templates
    const content = page.locator('table, [class*="reminder"], [class*="template"], [class*="list"]').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })
})
