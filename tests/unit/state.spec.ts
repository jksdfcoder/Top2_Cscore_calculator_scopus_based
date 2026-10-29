import { afterEach, expect, test, vi } from 'vitest'
import { effectScope } from 'vue'
import { readFileSync } from 'node:fs'
import { useAnalysis } from '../../app/composables/useAnalysis'

afterEach(() => vi.restoreAllMocks())

test('a cancelled demo fetch cannot import after clear', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      await gate
      return new Response(readFileSync(`public${url}`, 'utf8'))
    }),
  )
  const scope = effectScope()
  const model = scope.run(() => useAnalysis())!
  const pending = model.loadDemo()
  expect(model.busy.value).toBe(true)
  model.clear()
  release()
  await pending
  expect(model.files.value).toEqual([])
  expect(model.analysis.value).toBeNull()
  expect(model.isDemo.value).toBe(false)
  scope.stop()
  vi.unstubAllGlobals()
})

test('new personal imports survive a delayed demo completion', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      await gate
      return new Response(readFileSync(`public${url}`, 'utf8'))
    }),
  )
  const scope = effectScope()
  const model = scope.run(() => useAnalysis())!
  const pending = model.loadDemo()
  model.clear()
  await model.importFiles([
    new File([readFileSync('public/demo/publications.csv', 'utf8')], 'my-publications.csv'),
  ])
  const ids = model.files.value.map((f) => f.id)
  release()
  await pending
  expect(model.files.value.map((f) => f.id)).toEqual(ids)
  expect(model.files.value.map((f) => f.name)).toEqual(['my-publications.csv'])
  expect(model.isDemo.value).toBe(false)
  expect(model.analysis.value).toBeNull()
  scope.stop()
  vi.unstubAllGlobals()
})

test('adding a supplementary file keeps manual matching decisions', async () => {
  const scope = effectScope()
  const model = scope.run(() => useAnalysis())!
  const csv = (name: string) => new File([readFileSync(`public/demo/${name}`, 'utf8')], name)
  await model.importFiles([csv('publications.csv')])
  model.resolve('sha256:x:7', '2-s2.0-1')
  await model.importFiles([csv('including.csv')])
  expect(model.decisions.value).toEqual({ 'sha256:x:7': '2-s2.0-1' })
  scope.stop()
})
