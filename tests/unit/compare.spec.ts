import { describe, it, expect } from 'vitest'
import { compare, percentileBand, type ComparisonData } from '../../app/lib/cscore'
import data from '../../public/reference/v9/comparison.json'

const reference = data as ComparisonData
const epi = reference.scopes.career.subfields.find((s) => s.name === 'Epidemiology')!

describe('official subfield comparison', () => {
  it('ships every subfield for both scopes with a 2% line inside the 95–99 band', () => {
    for (const scope of ['career', 'single-year'] as const) {
      const s = reference.scopes[scope]
      expect(s.fields).toHaveLength(20)
      expect(s.subfields).toHaveLength(174)
      for (const sub of s.subfields) {
        expect(s.fields.some((f) => f.name === sub.field)).toBe(true)
        expect(sub.top2['with-self']).toBeGreaterThanOrEqual(sub.c['95'])
        expect(sub.top2['with-self']).toBeLessThanOrEqual(sub.c['99'])
        expect(sub.top2['without-self']).not.toBeNull()
      }
    }
  })
  it('places scores in all-author percentile bands only for the all-citation score', () => {
    expect(percentileBand(0.5, epi, 'with-self')).toBe('Below the 25th percentile')
    expect(percentileBand(epi.c['90'], epi, 'with-self')).toBe(
      'Between the 90th and 95th percentiles',
    )
    expect(percentileBand(9, epi, 'with-self')).toBe('At or above the 99th percentile')
    expect(percentileBand(9, epi, 'without-self')).toBeNull()
  })
  it('uses the line for the requested scope and self-citation mode', () => {
    const r = compare(3.5, reference, 'career', 'without-self', epi)
    expect(r.top2).toBe(epi.top2['without-self'])
    expect(r.top2Gap).toBeCloseTo(3.5 - epi.top2['without-self']!, 12)
    expect(r.top100k).toBe(reference.scopes.career.top100k['without-self'])
    expect(r.band).toBeNull()
  })
})
