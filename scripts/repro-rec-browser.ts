import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'
import { db } from '../src/lib/db'

async function getSession(): Promise<string> {
  return readFileSync('session_token.txt', 'utf8').trim()
}

async function main() {
  const session = await getSession()
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  await ctx.addCookies([{ name: 'clinicsai_session', value: session, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  const page = await ctx.newPage()
  const patchInfo: any[] = []
  page.on('request', async (req: any) => {
    if (req.method() === 'PATCH') {
      const body = req.postData()
      const res = await req.response()
      let respBody: any = null
      try { respBody = await res!.json() } catch {}
      patchInfo.push({ url: req.url(), status: res?.status(), reqBody: body, respBody })
    }
  })

  await page.goto('http://localhost:8000/dashboard/clinic/receptionists', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  await page.locator('button[aria-label="Edit receptionist"]').first().click()
  await page.waitForTimeout(600)
  const phoneInput = page.locator('input[placeholder="3123456789"]').first()
  const beforeVal = await phoneInput.inputValue()
  const id = (await page.locator('button[aria-label="Edit receptionist"]').first().getAttribute('aria-label')) || ''

  await phoneInput.fill('')
  await page.waitForTimeout(200)
  await phoneInput.fill('3001234567')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Save Changes/i }).click()
  await page.waitForTimeout(1500)

  console.log('DIALOG PHONE BEFORE:', JSON.stringify(beforeVal))
  console.log('PATCH INFO:', JSON.stringify(patchInfo, null, 2))

  // Pull the receptionist id from the patch URL
  const pid = patchInfo[0]?.url?.split('/').pop()
  const recDb = await db.receptionist.findUnique({ where: { id: pid }, select: { name: true, phone: true } })
  console.log('DB AFTER PATCH (id=' + pid + '):', JSON.stringify(recDb))

  // Also check via API directly
  const listRes = await fetch('http://localhost:8000/api/receptionists', { headers: { cookie: `clinicsai_session=${session}` } })
  const listJson = await listRes.json() as any
  const apiRec = listJson.data?.items?.find((x: any) => x.id === pid)
  console.log('API AFTER PATCH:', JSON.stringify(apiRec))

  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
