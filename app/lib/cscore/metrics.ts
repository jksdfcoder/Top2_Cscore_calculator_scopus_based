import {
  metricNames,
  type Metrics,
  type CalculationResult,
  type Scope,
  type SelfMode,
  type ReferenceVersion,
} from './contracts'
export interface MetricPaper {
  eid: string
  citations: number
  authorCount: number
  position: 'single' | 'first' | 'last' | 'middle'
}
export function indicators(papers: MetricPaper[]): Metrics {
  const ordered = [...papers].sort((a, b) => {
    const c = b.citations - a.citations
    if (c) return c
    const ai = BigInt(a.eid.replace(/^2-s2\.0-/, '')),
      bi = BigInt(b.eid.replace(/^2-s2\.0-/, ''))
    return ai < bi ? -1 : ai > bi ? 1 : 0
  })
  let H = 0,
    Hm = 0,
    rank = 0
  ordered.forEach((p, i) => {
    if (p.citations >= i + 1) H = i + 1
    rank += 1 / p.authorCount
    if (p.citations >= rank) Hm = rank
  })
  const sum = (positions: string[]) =>
    papers.filter((p) => positions.includes(p.position)).reduce((s, p) => s + p.citations, 0)
  return {
    NC: papers.reduce((s, p) => s + p.citations, 0),
    H,
    Hm,
    NCS: sum(['single']),
    NCSF: sum(['single', 'first']),
    NCSFL: sum(['single', 'first', 'last']),
  }
}
export function calculate(
  papers: MetricPaper[],
  scope: Scope,
  selfMode: SelfMode,
  reference: ReferenceVersion,
): CalculationResult {
  const metrics = indicators(papers),
    contributions = {} as Metrics
  for (const k of metricNames) {
    const d = reference.maxlog[scope][selfMode][k]
    if (!Number.isFinite(d) || d <= 0) throw new Error(`Invalid normalization denominator: ${k}`)
    contributions[k] = Math.log1p(metrics[k]) / d
  }
  return {
    scope,
    selfMode,
    metrics,
    contributions,
    cScore: Object.values(contributions).reduce((a, b) => a + b, 0),
    paperCount: papers.length,
  }
}
export function referenceFromMaxlog(
  data: { modes: Record<string, { denominators: Metrics }> },
  id = 'v9',
  citationYear = 2025,
  careerStartYear = 1996,
): ReferenceVersion {
  const maxlog = {} as ReferenceVersion['maxlog']
  for (const scope of ['career', 'single-year'] as const) {
    maxlog[scope] = {} as Record<SelfMode, Metrics>
    for (const sm of ['with-self', 'without-self'] as const)
      maxlog[scope][sm] =
        data.modes[
          `${scope === 'career' ? 'career' : 'singleyr'}_${sm.replaceAll('-', '_')}`
        ]!.denominators
  }
  return { id, citationYear, careerStartYear, maxlog }
}
