import type { Issue, MatchedRow, Paper, ReferenceVersion, Scope, SelfMode } from './contracts'
export function assessCoverage(
  papers: Paper[],
  matches: MatchedRow[],
  reference: ReferenceVersion,
  scope: Scope,
  selfMode: SelfMode,
): { counts: Map<string, number>; issues: Issue[] } {
  const issues: Issue[] = [],
    counts = new Map<string, number>()
  const start = scope === 'career' ? reference.careerStartYear : reference.citationYear
  const end = reference.citationYear
  for (const paper of papers) {
    const rows = matches.filter((m) => m.paper.eid === paper.eid && m.file.selfMode === selfMode)
    const explicit = new Map<number, number | null>()
    let bad = false
    const problem = (code: string, message: string) => {
      issues.push({ code, message, eid: paper.eid })
      bad = true
    }
    if (!rows.length) {
      problem('missing-overview', `No ${selfMode} citation overview row for this publication.`)
      continue
    }
    for (const { row } of rows)
      for (const [key, value] of Object.entries(row.counts))
        if (/^\d{4}$/.test(key)) {
          const y = Number(key)
          if (explicit.has(y) && explicit.get(y) !== value)
            problem('overlap-conflict', `Citation counts disagree for ${y}.`)
          else explicit.set(y, value)
        }
    const covered = new Set<number>()
    let total = 0
    for (const [year, value] of explicit) {
      if (year < start || year > end) continue
      if (value === null) problem('missing-count', `Blank or invalid citation count for ${year}.`)
      else {
        total += value
        covered.add(year)
      }
    }
    // Only historical buckets certify coverage. Scopus supplementary exports can
    // report >end=0 for newer publications despite positive explicit years in a
    // full export; retain those raw values but do not infer coverage from them.
    const buckets = rows.flatMap(({ row }) =>
      Object.entries(row.counts)
        .filter(([k]) => /^<\d{4}$/.test(k))
        .map(([key, value]) => ({ key, value, row })),
    )
    const bounds = (key: string): [number, number] => [-Infinity, Number(key.slice(1)) - 1]
    for (const bucket of buckets) {
      if (bucket.value === null) continue
      const [lo, hi] = bounds(bucket.key) as [number, number]
      const knownSum = [...explicit]
        .filter(([y, v]) => y >= lo && y <= hi && v !== null)
        .reduce((n, [, v]) => n + v!, 0)
      if (knownSum > bucket.value)
        problem(
          'bucket-conflict',
          `Bucket ${bucket.key} contradicts explicit yearly citation counts.`,
        )
      for (const other of buckets) {
        if (other === bucket || other.value === null) continue
        const [otherLo, otherHi] = bounds(other.key) as [number, number]
        if (otherLo >= lo && otherHi <= hi && other.value > bucket.value)
          problem(
            'bucket-conflict',
            `Overlapping citation buckets ${bucket.key} and ${other.key} disagree.`,
          )
      }
    }
    for (const { key, value } of buckets) {
      const upper = Number(key.slice(1)) - 1
      const years = Array.from({ length: end - start + 1 }, (_, i) => start + i).filter(
        (y) => y <= upper,
      )
      if (!years.length || years.every((y) => covered.has(y))) continue
      if (value === 0) {
        years.forEach((y) => {
          if (!explicit.has(y)) covered.add(y)
        })
        continue
      }
      if (value === null) continue
      // A nonzero unbounded bucket cannot prove how much belongs inside this window.
      // Publication year is not a safe lower bound: exports can contain earlier citations.
    }
    const missing = Array.from({ length: end - start + 1 }, (_, i) => start + i).filter(
      (y) => !covered.has(y),
    )
    if (missing.length)
      problem(
        'missing-years',
        `Missing citation years ${missing[0]}–${missing.at(-1)}. Export a supplementary window with explicit years; nonzero buckets crossing ${start} cannot establish coverage.`,
      )
    if (!bad) counts.set(paper.eid, total)
  }
  return { counts, issues }
}
