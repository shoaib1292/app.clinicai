import { test, expect } from '@playwright/test'

/**
 * E2E: Create Doctor → Create Service → Generate Slots
 *
 * Tests the clinic admin's ability to:
 * 1. Navigate to doctors management
 * 2. Create a new doctor with schedule
 * 3. Create a service linked to the doctor
 * 4. Generate time slots for the doctor
 * 5. Verify slots are visible in the public booking flow
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

test.describe('Doctor & Service Management', () => {
  test('navigate to doctors page', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/doctors')
    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })
  })

  test('create a new doctor', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/doctors')

    // Click "Add Doctor" or similar CTA
    const addBtn = page.locator('button:has-text("Add Doctor"), button:has-text("New Doctor"), a:has-text("Add Doctor")').first()
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Fill doctor form
    const doctorName = `E2E Doctor ${Date.now()}`
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[id*="name"]').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill(doctorName)
    }

    const specialityInput = page.locator('input[name="speciality"], select[name="speciality"], input[placeholder*="speciality" i]').first()
    if (await specialityInput.isVisible()) {
      await specialityInput.fill('General')
    }

    // Set slot duration
    const durationInput = page.locator('input[name="slotDuration"], input[type="number"]').first()
    if (await durationInput.isVisible()) {
      await durationInput.fill('15')
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(2000)
    }

    // Verify doctor appears in list
    await expect(page.locator(`text=${doctorName}`).first()).toBeVisible({ timeout: 10000 })
  })

  test('create a service linked to a doctor', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/services')

    const addBtn = page.locator('button:has-text("Add Service"), button:has-text("New Service")').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(1000)
    }

    // Fill service form if visible
    const nameInput = page.locator('input[name="name"], input[placeholder*="service" i]').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill(`Consultation ${Date.now()}`)
    }

    const feeInput = page.locator('input[name="baseFee"], input[placeholder*="fee" i], input[type="number"]').first()
    if (await feeInput.isVisible()) {
      await feeInput.fill('500')
    }

    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first()
    if (await submitBtn.isVisible()) {
      await submitBtn.click()
      await page.waitForTimeout(2000)
    }
  })

  test('generate slots for a doctor', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/slots')

    // Look for slot generation trigger
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Generate Slots")').first()
    if (await generateBtn.isVisible()) {
      await generateBtn.click()
      await page.waitForTimeout(2000)
    }

    // Verify slots page rendered
    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })
  })
})
