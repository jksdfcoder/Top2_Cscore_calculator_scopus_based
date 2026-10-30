import type { Scope, SelfMode } from './contracts'
export const percentiles = ['25', '50', '75', '90', '95', '99'] as const
export interface Cohort {
  name: string
  authors: number
  listed: number
  c: Record<(typeof percentiles)[number], number>
}
export interface Subfield extends Cohort {
  field: string
  top2: Record<SelfMode, number | null>
}
export interface ComparisonData {
  version: string
  citationYear: number
  snapshot: string
  license: string
  dataset: string
  sources: { file: string; sha256: string }[]
  scopes: Record<
    Scope,
    {
      top100k: Record<SelfMode, number>
      fields: (Cohort & { domain: string })[]
      subfields: Subfield[]
    }
  >
}
// Official percentiles use the all-citation c-score, so excluding-self scores get no band.
export function percentileBand(c: number, cohort: Cohort, selfMode: SelfMode): string | null {
  if (selfMode !== 'with-self') return null
  const above = percentiles.filter((p) => c >= cohort.c[p]).at(-1)
  const next = percentiles[above ? percentiles.indexOf(above) + 1 : 0]
  if (!above) return 'Below the 25th percentile'
  return next
    ? `Between the ${above}th and ${next}th percentiles`
    : 'At or above the 99th percentile'
}
export function compare(
  c: number,
  data: ComparisonData,
  scope: Scope,
  selfMode: SelfMode,
  subfield: Subfield,
) {
  const top2 = subfield.top2[selfMode]
  const top100k = data.scopes[scope].top100k[selfMode]
  return {
    band: percentileBand(c, subfield, selfMode),
    top2,
    top2Gap: top2 === null ? null : c - top2,
    top100k,
    top100kGap: c - top100k,
  }
}

// Log-rank coordinates are only an illustration between available reference points.
// Never extrapolate a personal position beyond the reference range.
export function illustrativePosition(c: number, points: [number, number][]): number | null {
  const sorted = [...points].sort((a, b) => b[0] - a[0])
  for (let i = 1; i < sorted.length; i++) {
    const [hiC, hiRank] = sorted[i - 1]!
    const [loC, loRank] = sorted[i]!
    if (c > hiC || c < loC || loRank < hiRank) continue
    const t = hiC === loC ? 0 : (hiC - c) / (hiC - loC)
    return Math.exp(Math.log(hiRank) + t * (Math.log(loRank) - Math.log(hiRank)))
  }
  return null
}
