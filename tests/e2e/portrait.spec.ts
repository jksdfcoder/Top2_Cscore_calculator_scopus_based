import { test, expect } from '@playwright/test'

test('portrait prioritizes scores and comparison controls without hiding key limits', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const demo = page.getByRole('button', { name: 'Try a synthetic example' })
  const demoBox = await demo.boundingBox()
  expect(demoBox!.y + demoBox!.height).toBeLessThan(844)
  await demo.click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await expect
    .poll(() => page.locator('#score').evaluate((el) => el.getBoundingClientRect().top))
    .toBeLessThan(80)
  for (const score of await page.locator('.score').all()) {
    const value = await score.locator('.score-value').boundingBox()
    const terms = await score.locator('.score-terms').boundingBox()
    expect(value!.y + value!.height).toBeLessThan(terms!.y)
  }
  await expect(page.locator('.score-context')).toBeVisible()
  await expect(page.locator('.score-context')).toContainText('research quality')
  const exclude = page.getByRole('tab', { name: 'Exclude self-citations', exact: true })
  expect(Math.round((await exclude.boundingBox())!.height)).toBeGreaterThanOrEqual(44)
  const comparison = page.locator('#comparison')
  const chart = page.locator('.indicator-view')
  expect((await comparison.boundingBox())!.y).toBeLessThan((await chart.boundingBox())!.y)
  await expect(comparison.locator('.comparison-context').first()).toContainText(
    'not a verified official classification',
  )
  // The rank caveat appears with the bar, once a subfield is chosen.
  await expect(comparison.locator('.marker-context')).toHaveCount(0)

  for (const width of [320, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    const subfield = await page
      .getByRole('button', { name: 'Comparison subfield', exact: true })
      .boundingBox()
    expect(Math.round(subfield!.height)).toBeGreaterThanOrEqual(44)
  }
  // A narrow parent on a wide screen must stack too; viewport-only queries would miss this.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addStyleTag({ content: '.shell { max-width: 600px; } html { font-size: 20px; }' })
  expect((await comparison.boundingBox())!.y).toBeLessThan((await chart.boundingBox())!.y)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test('touch scroll over the reference track does not select an author; horizontal drag does', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Chromium CDP touch input; other engines covered by layout and keyboard journeys',
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Try a synthetic example' }).click()
  await expect(page.getByRole('status').first()).toContainText('4 of 4')
  await page.getByRole('button', { name: 'Comparison subfield', exact: true }).click()
  await page.getByPlaceholder('Type a subfield or field…', { exact: true }).fill('Biophysics')
  await page.getByRole('option', { name: 'Biophysics', exact: true }).click()
  const track = page.locator('.standing-track')
  const slider = page.getByRole('slider', { name: 'Compare with a listed author' })
  await expect(slider).toBeVisible()
  await track.scrollIntoViewIfNeeded()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true })
  async function swipe(x: number, y: number, dx: number, dy: number) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    })
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * step) / 8, y: y + (dy * step) / 8, id: 1 }],
      })
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      )
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const selected = await slider.getAttribute('aria-valuenow')
  const initialScroll = await page.evaluate(() => scrollY)
  const box = (await track.boundingBox())!
  await swipe(box.x + box.width * 0.25, box.y + box.height / 2, 0, -100)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initialScroll)
  await expect(slider).toHaveAttribute('aria-valuenow', selected!)
  await slider.scrollIntoViewIfNeeded()
  const thumb = (await slider.boundingBox())!
  await swipe(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2, -80, 0)
  await expect(slider).not.toHaveAttribute('aria-valuenow', selected!)
})
