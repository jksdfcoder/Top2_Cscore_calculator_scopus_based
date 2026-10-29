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
  await expect(page.locator('#score')).toContainText('1.144')
  await expect(page.locator('#score')).toContainText('1.394')
  await expect(page.locator('#results')).toContainText('1.143570')
  await page.getByRole('tab', { name: 'Single year · 2025', exact: true }).click()
  await expect(page.locator('#results tfoot')).toContainText('1.394161')
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
  await expect(page.locator('input[type=file]')).toBeEnabled()
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
  // Scan content at rest; scroll reveals are mid-fade otherwise.
  await page.emulateMedia({ reducedMotion: 'reduce' })
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
  const scores = page.locator('#score .score-value')
  await expect(scores).toHaveCount(2)
  const excluding = await scores.allTextContents()
  await page.getByRole('tab', { name: 'Include self-citations', exact: true }).click()
  await expect(page.locator('#results')).toContainText('Including self-citations')
  const including = await scores.allTextContents()
  await page.getByRole('tab', { name: 'Exclude self-citations', exact: true }).click()
  await expect(page.locator('#results')).toContainText('Excluding all-author self-citations')
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

  await page.emulateMedia({ reducedMotion: 'reduce' })
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

  const standing = page.locator('#comparison')
  await expect(standing).toContainText('Epidemiology')
  await page.getByRole('tab', { name: 'Include self-citations', exact: true }).click()
  await expect(standing).toContainText(`Subfield top 2% line ${top2}`)
  const peer = page.getByRole('slider', { name: 'Compare with a listed author' })
  await peer.focus()
  await page.keyboard.press('Home')
  await expect(peer).toHaveAttribute('aria-valuetext', /rank 1 of /)
  await page.locator('#results-heading').click()
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await page.locator('.standing-track').scrollIntoViewIfNeeded()
  const track = (await page.locator('.standing-track').boundingBox())!
  await page.mouse.click(track.x + track.width * 0.55, track.y + track.height / 2)
  await expect(peer).not.toHaveAttribute('aria-valuetext', /rank 1 of /)
  await page.getByRole('tab', { name: 'Exclude self-citations', exact: true }).click()
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

test('export guide and methodology open as dialogs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'How to export three files from Scopus' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Citation overview')
  await dialog.getByRole('button', { name: 'What happens to my files?' }).click()
  await expect(dialog).toContainText('not uploaded')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Methodology', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('the formula is the same in every field')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('contentinfo')).toContainText('Not an official service of')
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

test('standing reveals You only after the bar and peer data are ready', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/peers/career/epidemiology.json', async (route) => {
    await pending
    await route.continue()
  })
  await page.goto('/')
  await page.addStyleTag({ content: '.standing-fill { animation-duration: 10s !important; }' })
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await page.getByRole('tab', { name: 'Include self-citations', exact: true }).click()
  await page.getByRole('button', { name: 'Field', exact: true }).click()
  await page.getByRole('option', { name: 'Public Health & Health Services', exact: true }).click()
  await page.getByRole('button', { name: 'Subfield', exact: true }).click()
  await page.getByRole('option', { name: 'Epidemiology', exact: true }).click()
  await closeOverlays(page)
  const marker = page.locator('.standing-marker.you')
  await expect(marker).toHaveCount(0)
  await page
    .locator('.standing-fill')
    .evaluate((element) => element.getAnimations().forEach((a) => a.finish()))
  // Animation completion alone must not reveal the preliminary percentile position.
  await expect(marker).toHaveCount(0)
  release()
  await expect(page.getByRole('slider', { name: 'Compare with a listed author' })).toBeVisible()
  await expect(marker.locator(':scope > span')).toBeVisible()
  // A new animation with already-loaded data must also hide You until its end.
  await page.getByRole('tab', { name: 'Exclude self-citations', exact: true }).click()
  await expect(marker).toHaveCount(0)
  await page
    .locator('.standing-fill')
    .evaluate((element) => element.getAnimations().forEach((a) => a.finish()))
  await expect(marker.locator(':scope > span')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('tab', { name: 'Include self-citations', exact: true }).click()
  await expect(marker.locator(':scope > span')).toBeVisible()
})

test('score changes briefly show directional arrows and footer separates code from data rights', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await expect(page.locator('#score .score-formula')).toHaveCount(0)
  await expect(page.locator('#score .number-change')).toHaveCount(0)
  // Hold animation time to inspect every changed value deterministically.
  await page.addStyleTag({ content: '.number-change { animation-play-state: paused !important; }' })
  const values = page.locator('#score .changing-number')
  await expect(values).toHaveCount(14)
  const before = (await values.allTextContents()).map(Number)
  await page.getByRole('tab', { name: 'Include self-citations', exact: true }).click()
  const after = (await values.allTextContents()).map(Number)
  for (let i = 0; i < before.length; i++) {
    const arrow = values.nth(i).locator('.number-change')
    if (before[i] === after[i]) await expect(arrow).toHaveCount(0)
    else
      await expect(arrow).toHaveAttribute('data-direction', after[i]! > before[i]! ? 'up' : 'down')
  }
  await page.getByRole('tab', { name: 'Exclude self-citations', exact: true }).click()
  for (let i = 0; i < before.length; i++) {
    const arrow = values.nth(i).locator('.number-change')
    if (before[i] !== after[i])
      await expect(arrow).toHaveAttribute('data-direction', before[i]! > after[i]! ? 'up' : 'down')
  }
  await page
    .locator('#score .number-change')
    .evaluateAll((arrows) => arrows.forEach((el) => el.getAnimations().forEach((a) => a.finish())))
  await expect(page.locator('#score .number-change')).toHaveCount(0)
  const footer = page.getByRole('contentinfo')
  await expect(footer).toContainText('open-source')
  await expect(footer).toContainText(
    'does not upload, collect or persistently store your imported data',
  )
  await expect(footer).toContainText('CC BY-NC 3.0')
  await expect(footer.getByRole('link', { name: 'MIT', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Include self-citations', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test('score components explain their indicators on hover and keyboard focus', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('input[type=file]')).toBeEnabled()
  await page.locator('input[type=file]').setInputFiles(threeFiles)
  await page.getByRole('button', { name: 'Confirm author & calculate' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  const definitions = {
    NC: 'Total citations received by your publications',
    H: 'The largest h for which h of your publications',
    Hm: 'fractional paper counts of 1 divided by',
    NCS: 'sole author.',
    NCSF: 'sole author or first author.',
    NCSFL: 'sole author, first author or last author.',
  }
  for (const [metric, definition] of Object.entries(definitions)) {
    const trigger = page.getByRole('button', { name: new RegExp(`^${metric}:`) }).first()
    await trigger.hover()
    await expect(page.getByRole('tooltip')).toContainText(definition)
    await expect(page.getByRole('tooltip')).toContainText('normalized c-score contribution')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('tooltip')).toHaveCount(0)
  }
  await page.mouse.move(0, 0)
  await page.keyboard.press('Tab')
  await page.getByRole('button', { name: /^Hm:/ }).first().focus()
  await expect(page.getByRole('tooltip')).toContainText(definitions.Hm)
})
