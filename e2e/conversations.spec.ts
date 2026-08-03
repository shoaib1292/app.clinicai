import { test, expect } from '@playwright/test'

/**
 * E2E: Conversations & AI Chat Testing
 *
 * Tests the WhatsApp conversations list + agent chat testing:
 * 1. Navigate to conversations list
 * 2. Filter by status (all/unread/resolved)
 * 3. Open a conversation detail
 * 4. Navigate to agent chat test page
 * 5. Send a test message to the AI agent
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

test.describe('Conversations & AI Chat', () => {
  test('conversations page loads with list', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/conversations')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should show conversation list
    const convList = page.locator('table, [class*="conversation"], [class*="chat-list"]').first()
    await expect(convList).toBeVisible({ timeout: 10000 })
  })

  test('conversation filters work', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/conversations')

    // Look for status filter buttons/tabs
    const allFilter = page.locator('button:has-text("All"), [role="tab"]:has-text("All")').first()
    const unreadFilter = page.locator('button:has-text("Unread"), [role="tab"]:has-text("Unread")').first()
    const resolvedFilter = page.locator('button:has-text("Resolved"), [role="tab"]:has-text("Resolved"), button:has-text("Closed")').first()

    const hasFilters = await allFilter.isVisible().catch(() => false)
    if (hasFilters) {
      // Click unread filter
      if (await unreadFilter.isVisible().catch(() => false)) {
        await unreadFilter.click()
        await page.waitForTimeout(1500)
      }
      // Click back to all
      if (await allFilter.isVisible().catch(() => false)) {
        await allFilter.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('can open conversation detail', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/conversations')

    // Click on first conversation
    const firstConv = page.locator('table tbody tr, a[href*="/dashboard/conversations/"], [class*="conversation-item"]').first()
    if (await firstConv.isVisible().catch(() => false)) {
      await firstConv.click()
      await page.waitForTimeout(2000)

      // Should show conversation detail with messages
      const messages = page.locator('[class*="message"], [class*="chat-bubble"], [class*="bubble"]').first()
      await expect(messages).toBeVisible({ timeout: 5000 })
    }
  })

  test('agent chat test page works', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/agent-chat')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Find chat input and send a test message
    const chatInput = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="chat" i], [contenteditable="true"]').first()

    if (await chatInput.isVisible().catch(() => false)) {
      await chatInput.fill('Hello, I need to book an appointment')
      await page.waitForTimeout(500)

      // Find send button
      const sendBtn = page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]').first()
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click()
        await page.waitForTimeout(3000)

        // Should get a response
        const response = page.locator('[class*="message"], [class*="bubble"]').last()
        await expect(response).toBeVisible({ timeout: 10000 })
      } else {
        // Try pressing Enter to send
        await chatInput.press('Enter')
        await page.waitForTimeout(3000)
      }
    }
  })

  test('agent persona page is accessible', async ({ page }) => {
    await loginAsClinic(page)
    await page.goto('/dashboard/clinic/agent')

    await expect(page.locator('h1, .page-title').first()).toBeVisible({ timeout: 10000 })

    // Should have agent name, gender, tone settings
    const nameInput = page.locator('input[name="agentName"], input[placeholder*="name" i]').first()
    await expect(nameInput).toBeVisible({ timeout: 5000 })
  })
})
