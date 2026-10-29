import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const fixture = (name: string) => resolve('tests/fixtures/public', name)
const threeFiles = ['publications.csv', 'including.csv', 'excluding.csv'].map(fixture)

test('one import produces four modes, downloads a private report, then clears', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (m) => {
    if (/content security policy/i.test(m.text())) errors.push(m.text())
  })
  await page.goto('/')
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(threeFiles)
  await expect(page.getByLabel('Scopus Author ID', { exact: true })).toContainText('123')
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await expect(page.locator('#results')).toContainText('1.143570')
  await expect(page.locator('#results')).toContainText('1.394161')
  await page.getByRole('tab', { name: 'Single year · 2025', exact: true }).click()
  await expect(page.locator('.metric-table tfoot')).toContainText('1.394161')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download audit JSON' }).click()
  const download = await downloaded
  const stream = await download.createReadStream()
  let text = ''
  for await (const chunk of stream!) text += chunk.toString()
  const report = JSON.parse(text)
  expect(report.modes.filter((mode: { ready: boolean }) => mode.ready)).toHaveLength(4)
  expect(text).not.toContain('A synthetic solitary paper')
  expect(report).not.toHaveProperty('authorIds')
  expect(report.files.every((file: { id: string }) => file.id.startsWith('sha256:'))).toBe(true)
  await page.getByRole('button', { name: 'Clear all data' }).click()
  await expect(page.locator('#results')).toHaveCount(0)
  await expect(page.getByRole('status').first()).toContainText('No files selected')
  expect(errors).toEqual([])
})

test('missing citation data stays incomplete and adding files recovers', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(fixture('publications.csv'))
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('0 of 4')
  await expect(page.locator('#results')).toContainText('Incomplete')
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(threeFiles.slice(1))
  await expect(page.locator('#results')).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await page.getByRole('button', { name: 'Remove excluding.csv', exact: true }).click()
  await expect(page.locator('#results')).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('2 of 4')
  await expect(page.locator('#results')).not.toContainText('Incomplete')
})

test('unknown files are explained and can be replaced', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles({
    name: 'wrong.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,count\nwrong,1'),
  })
  await expect(page.getByRole('heading', { name: 'Check your data' })).toBeVisible()
  await expect(page.locator('#review')).toContainText('Scopus documents CSV')
  await page.getByRole('button', { name: 'Remove wrong.csv' }).click()
  await expect(page.getByRole('status').first()).toContainText('No files selected')
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(threeFiles)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
})

test('private input is not transmitted or persisted and narrow layout fits', async ({ page }) => {
  const requests: { url: string; method: string; body: string | null }[] = []
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() }))
  await page.goto('/')
  const canary = 'PRIVATE_INPUT_CANARY_824701'
  const source = await import('node:fs/promises')
  const changed = await Promise.all(
    threeFiles.map(async (path) => ({
      name: path.split('/').at(-1)!,
      mimeType: 'text/csv',
      buffer: Buffer.from(
        (await source.readFile(path, 'utf8')).replaceAll('A synthetic solitary paper', canary),
      ),
    })),
  )
  expect(changed.every((file) => file.buffer.includes(Buffer.from(canary)))).toBe(true)
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(changed)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  expect(
    requests.every(
      (r) => r.method === 'GET' && new URL(r.url).origin === new URL(page.url()).origin,
    ),
  ).toBe(true)
  expect(JSON.stringify(requests)).not.toContain(canary)
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.reload()
  await expect(page.locator('#results')).toHaveCount(0)
})

test('synthetic example and result table pass accessibility checks', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await expect(page.getByText('Synthetic example · author ID 123', { exact: true })).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])
})

async function closeOverlays(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const open = await page.evaluate(
      () =>
        document.body.style.pointerEvents === 'none' ||
        document.querySelectorAll('[role="listbox"]').length > 0,
    )
    if (!open) return
    await page.keyboard.press('Escape')
  }
  await expect.poll(() => page.evaluate(() => document.body.style.pointerEvents)).toBe('')
}

async function fourResultScores(page: Page) {
  const scores = page.locator('#results .score-value')
  const setting = page.getByLabel('Self-citation setting')
  await expect(scores).toHaveCount(2)
  const excluding = await scores.allTextContents()
  await setting.click()
  await page.getByRole('option', { name: 'Include self-citations', exact: true }).click()
  await expect(setting).toContainText('Include self-citations')
  await closeOverlays(page)
  const including = await scores.allTextContents()
  await setting.click()
  await page.getByRole('option', { name: 'Exclude all-author self-citations', exact: true }).click()
  await expect(setting).toContainText('Exclude all-author self-citations')
  await closeOverlays(page)
  return [...excluding, ...including]
}

test('J5 compares Epidemiology without changing the four results', async ({ page }) => {
  const comparison = JSON.parse(
    readFileSync(resolve('public/reference/v9/comparison.json'), 'utf8'),
  ) as {
    scopes: { career: { subfields: { name: string; top2: { 'with-self': number } }[] } }
  }
  const top2 = comparison.scopes.career.subfields
    .find((subfield) => subfield.name === 'Epidemiology')!
    .top2['with-self'].toFixed(3)

  await page.goto('/')
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  const before = await fourResultScores(page)
  expect(before).toHaveLength(4)

  const field = page.getByRole('button', { name: 'Field', exact: true })
  await expect(field).toBeEnabled()
  await field.click()
  await page.getByRole('option', { name: 'Public Health & Health Services', exact: true }).click()
  const subfield = page.getByRole('button', { name: 'Subfield', exact: true })
  await expect(subfield).toBeEnabled()
  await subfield.click()
  await page.getByRole('option', { name: 'Epidemiology', exact: true }).click()
  await closeOverlays(page)

  const table = page.locator('#comparison table')
  await expect(table).toContainText('Epidemiology')
  await expect(table).toContainText(top2)
  expect(await fourResultScores(page)).toEqual(before)

  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test('clearing while a demo is fetching cancels the old request intent', async ({ page }) => {
  let release!: () => void
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/demo/*.csv', async (route) => {
    await wait
    await route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await page.getByRole('button', { name: 'Cancel import' }).click()
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(threeFiles)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  release()
  await expect(page.getByText('Synthetic example · author ID 123', { exact: true })).toHaveCount(0)
})
