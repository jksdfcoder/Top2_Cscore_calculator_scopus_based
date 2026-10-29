import type { Analysis, ParsedFile, ReferenceVersion, Paper, Issue } from './contracts'
import { matchPapers } from './match'
import { assessCoverage } from './coverage'
import { calculate } from './metrics'
export function analyze(
  files: ParsedFile[],
  authorIds: string[],
  reference: ReferenceVersion,
  decisions: Record<string, string> = {},
): Analysis {
  const unique = [...new Map(files.map((f) => [f.id, f])).values()]
  const issues: Issue[] = unique.flatMap((f) => f.issues)
  const paperMap = new Map<string, Paper>()
  for (const p of unique.flatMap((f) => f.papers)) {
    const previous = paperMap.get(p.eid)
    if (previous && JSON.stringify(previous) !== JSON.stringify(p))
      issues.push({
        code: 'conflicting-publication',
        message: 'Conflicting publication metadata for one EID.',
        eid: p.eid,
      })
    else paperMap.set(p.eid, p)
  }
  const allPapers = [...paperMap.values()]
  const papers = allPapers.filter((p) => p.publicationYear <= reference.citationYear)
  if (!papers.length)
    issues.push({
      code: 'missing-publications',
      message: 'Import a documents CSV with publications through the reference year.',
    })
  if (!authorIds.length || authorIds.some((id) => !/^\d+$/.test(id)))
    issues.push({
      code: 'missing-author',
      message: 'Confirm at least one numeric Scopus Author ID.',
    })
  for (const p of papers) {
    const hits = p.authorIds.filter((id) => authorIds.includes(id))
    if (hits.length !== 1 || !/^2-s2\.0-\d+$/.test(p.eid))
      issues.push({
        code: 'author-identity',
        message: 'Publication must contain exactly one confirmed author ID and a valid Scopus EID.',
        eid: p.eid,
      })
  }
  const matched = matchPapers(allPapers, unique, decisions)
  // Excluding all-author self citations cannot increase a year's citation count.
  for (const paper of papers) {
    const rows = matched.matches.filter((m) => m.paper.eid === paper.eid)
    const inc = rows.filter((m) => m.file.selfMode === 'with-self')
    const exc = rows.filter((m) => m.file.selfMode === 'without-self')
    if (!inc.length || !exc.length) continue
    const years = new Set(
      rows.flatMap((m) => Object.keys(m.row.counts).filter((k) => /^\d{4}$/.test(k))),
    )
    const values = (group: typeof rows, year: string) =>
      group.flatMap((m) => {
        const explicit = m.row.counts[year]
        if (explicit !== undefined && explicit !== null) return [explicit]
        const zero = Object.entries(m.row.counts).some(
          ([k, v]) => v === 0 && k[0] === '<' && Number(year) < Number(k.slice(1)),
        )
        return zero ? [0] : []
      })
    for (const year of years) {
      const withSelf = values(inc, year),
        withoutSelf = values(exc, year)
      if (withSelf.length && withoutSelf.length && Math.max(...withoutSelf) > Math.min(...withSelf))
        issues.push({
          code: 'self-citation-conflict',
          message: `Excluding all-author self citations increases the count for ${year}.`,
          eid: paper.eid,
        })
    }
  }
  const globalIssues = [...issues]
  const modes: Analysis['modes'] = []
  for (const scope of ['career', 'single-year'] as const)
    for (const selfMode of ['with-self', 'without-self'] as const) {
      const relevantFiles = new Set(unique.filter((f) => f.selfMode === selfMode).map((f) => f.id))
      const modeIssues = [
        ...globalIssues,
        ...matched.issues.filter((i) => i.fileId && relevantFiles.has(i.fileId)),
      ]
      const coverage = assessCoverage(papers, matched.matches, reference, scope, selfMode)
      modeIssues.push(...coverage.issues)
      if (
        unique.some((f) => f.kind === 'overview' && f.selfMode === 'selected-author') &&
        !relevantFiles.size
      )
        modeIssues.push({
          code: 'selected-author-exclusion',
          message:
            'Selected-author self-citation exclusion cannot replace exclusion of all authors.',
        })
      const ready = modeIssues.length === 0
      modes.push({
        scope,
        selfMode,
        ready,
        issues: modeIssues,
        ...(ready
          ? {
              result: calculate(
                papers.map((p) => {
                  const idx = p.authorIds.findIndex((id) => authorIds.includes(id))
                  return {
                    eid: p.eid,
                    citations: coverage.counts.get(p.eid)!,
                    authorCount: p.authorCount,
                    position:
                      p.authorCount === 1
                        ? 'single'
                        : idx === 0
                          ? 'first'
                          : idx === p.authorCount - 1
                            ? 'last'
                            : 'middle',
                  }
                }),
                scope,
                selfMode,
                reference,
              ),
            }
          : {}),
      })
    }
  return {
    papers,
    issues: [...globalIssues, ...matched.issues],
    modes,
    decisions: { ...decisions },
  }
}
