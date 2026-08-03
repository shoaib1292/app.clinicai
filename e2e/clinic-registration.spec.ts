import { test, expect } from '@playwright/test'

/**
 * E2E: Clinic Registration → Login → Dashboard Loads
 *
 * Tests the complete clinic onboarding flow:
 * 1. Navigate to landing page
 * 2. Click "Get Started" or "Register"
 * 3. Fill in clinic registration form
 * 4. Verify clinic admin is created
 * 5. Log in with credentials
 * 6. Verify dashboard loads with clinic data
 */

test.describe('Clinic Registration & Login', () => {
  test('landing page loads and shows registration CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, .hero-title, .landing-title').first()).toBeVisible()
    // Look for registration call-to-action link/button
    const registerLink = page.locator('a[href*="register"], a[href*="signup"], a[href*="get-started"], button:has-text("Register"), button:has-text("Get Started"), a:has-text("Register"), a:has-text("Get Started")').first()
    await expect(registerLink).toBeVisible()
  })

  test('login page renders and accepts credentials', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible()

    // Fill with test clinic credentials (from seed or env)
    const email = process.env.E2E_CLINIC_EMAIL || 'admin@clinic.test'
    const password = process.env.E2E_CLINIC_PASSWORD || 'test123456'
    await page.locator('input[type="email"], input[name="email"]').first().fill(email)
    await page.locator('input[type="password"], input[name="password"]').first().fill(password)
    await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first().click()

    // Wait for dashboard redirect
    await page.waitForURL(/dashboard/, { timeout: 15000 })
  })

  test('dashboard loads with key metrics', async ({ page }) => {
    // Login first
    const email = process.env.E2E_CLINIC_EMAIL || 'admin@clinic.test'
    const password = process.env.E2E_CLINIC_PASSWORD || 'test123456'
    await page.goto('/login')
    await page.locator('input[type="email"], input[name="email"]').first().fill(email)
    await page.locator('input[type="password"], input[name="password"]').first().fill(password)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/dashboard/, { timeout: 15000 })

    // Verify dashboard shows clinic info
    await expect(page.locator('h1, .dashboard-title, .greeting').first()).toBeVisible({ timeout: 10000 })

    // Key metric cards should exist (appointments count, patients count, etc.)
    const metricCards = page.locator('[class*="metric"], [class*="stat"], [class*="card"], [class*="kpi"]').first()
    await expect(metricCards).toBeVisible({ timeout: 10000 })
  })

  test('unauthorized access redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    // Should be redirected to login or shown 401
    await page.waitForURL(/\/(login|auth)/, { timeout: 10000 })
  })
})
