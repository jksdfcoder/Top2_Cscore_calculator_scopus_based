import { test, expect } from '@playwright/test'

test('Pages project path loads the calculator, demo, and author comparisons', async ({ page }) => {
  test.skip(!process.env.PAGES_BASE_PATH, 'Opt-in check against a project-path build')
  const prefix = process.env.PAGES_BASE_PATH!
  const badAssets: string[] = []
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (/content security policy/i.test(m.text())) errors.push(m.text())
  })
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (
      /\/(?:demo|reference|_nuxt)\//.test(path) &&
      (response.status() >= 400 || !path.startsWith(prefix))
    )
      badAssets.push(path)
  })
  await page.goto(prefix)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('C-score')
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await page.getByRole('button', { name: 'Field', exact: true }).click()
  await page.getByRole('option', { name: 'Biomedical Research', exact: true }).click()
  await page.getByRole('button', { name: 'Subfield', exact: true }).click()
  await page.getByRole('option', { name: 'Biophysics', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Compare with a listed author' })).toBeAttached()
  await expect(page.locator('.standing-marker.you > span')).toBeVisible()
  expect(badAssets).toEqual([])
  expect(errors).toEqual([])
})
