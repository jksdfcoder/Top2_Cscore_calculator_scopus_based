import { expect, it } from 'vitest'
import { indicators, type MetricPaper } from '../../app/lib/cscore/metrics'

it('a single boundary citation changes Hm even when the ordinary h-index is unchanged', () => {
  // Synthetic: six highly cited papers contribute 3 + 1/2 + 1/3 + 1/8 = 95/24.
  const prefix: MetricPaper[] = [1, 1, 1, 2, 3, 8].map((authorCount, i) => ({
    eid: `2-s2.0-${i + 1}`,
    authorCount,
    citations: 10,
    position: 'middle',
  }))
  const boundary: MetricPaper = {
    eid: '2-s2.0-7',
    authorCount: 5,
    citations: 5,
    position: 'middle',
  }
  const higher = indicators([...prefix, boundary])
  const lower = indicators([...prefix, { ...boundary, citations: 4 }])
  expect(higher.H).toBe(6)
  expect(lower.H).toBe(6)
  expect(higher.NC - lower.NC).toBe(1)
  expect(higher.Hm).toBeCloseTo(95 / 24 + 1 / 5, 12)
  expect(lower.Hm).toBeCloseTo(95 / 24, 12)
})
