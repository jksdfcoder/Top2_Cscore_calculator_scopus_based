import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Adversarial data stays synthetic: this checks the actual rendered error path.
test('CSV titles and filenames render as text without executing HTML', async ({ page }) => {
  const payload = '<svg onload="window.__cscoreXss=1"></svg>'
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  await expect(page.locator('input[type=file]')).toBeEnabled()
  const files = ['publications.csv', 'including.csv', 'excluding.csv'].map((name) => ({
    name: name === 'publications.csv' ? '<img src=x onerror=window.__cscoreXss=1>.csv' : name,
    mimeType: 'text/csv',
    buffer: Buffer.from(
      readFileSync(`tests/fixtures/public/${name}`, 'utf8').replaceAll(
        'A synthetic solitary paper',
        name === 'publications.csv' ? 'A different synthetic paper' : payload.replaceAll('"', '""'),
      ),
    ),
  }))
  await page.locator('input[type=file]').setInputFiles(files)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.locator('#review')).toContainText('<svg onload=')
  await expect(page.locator('body')).toContainText('<img src=x onerror=')
  expect(await page.evaluate(() => '__cscoreXss' in window)).toBe(false)
  await expect(page.locator('svg[onload], img[onerror]')).toHaveCount(0)
  expect(requests.some((url) => new URL(url).pathname === '/x')).toBe(false)
})
