import type { MatchResult, Paper, ParsedFile } from './contracts'
import { norm } from './parse'
const keys = (s: string) => [norm(s), norm(s.split('; [')[0]!)]
export function matchPapers(
  papers: Paper[],
  files: ParsedFile[],
  decisions: Record<string, string> = {},
): MatchResult {
  const matches: MatchResult['matches'] = [],
    issues: MatchResult['issues'] = []
  for (const file of files.filter((f) => f.kind === 'overview')) {
    const used = new Set<string>()
    for (const row of file.rows) {
      const title = norm(row.title)
      let method = 'title-year'
      let candidates = papers.filter(
        (p) => p.publicationYear === row.publicationYear && keys(p.title).includes(title),
      )
      if (!candidates.length && title.length >= 30) {
        candidates = papers.filter(
          (p) =>
            p.publicationYear === row.publicationYear &&
            keys(p.title).some((k) => k.startsWith(title)) &&
            norm(p.sourceTitle) === norm(row.sourceTitle) &&
            norm(p.volume) === norm(row.volume),
        )
        method = 'truncated-title-source-volume'
      }
      if (candidates.length > 1)
        for (const test of [
          (p: Paper) =>
            p.issn.some((i) => row.issn.includes(i)) ||
            norm(p.sourceTitle) === norm(row.sourceTitle),
          (p: Paper) => norm(p.sourceTitle) === norm(row.sourceTitle),
          (p: Paper) => norm(p.volume) === norm(row.volume) && norm(p.issue) === norm(row.issue),
        ]) {
          const narrower = candidates.filter(test)
          if (narrower.length) candidates = narrower
        }
      const decisionKey = `${file.id}:${row.row}`
      const chosen = decisions[decisionKey]
      if (chosen && candidates.some((p) => p.eid === chosen)) {
        candidates = candidates.filter((p) => p.eid === chosen)
        method = 'manual-confirmation'
      }
      if (candidates.length !== 1) {
        issues.push({
          code: 'ambiguous-match',
          severity: 'error',
          message: `Resolve citation row “${row.title}”.`,
          fileId: file.id,
          row: row.row,
          decisionKey,
          candidates: candidates.map(({ eid, title, sourceTitle }) => ({
            eid,
            title,
            sourceTitle,
          })),
        })
        continue
      }
      const paper = candidates[0]!
      if (used.has(paper.eid)) {
        issues.push({
          code: 'duplicate-row-reuse',
          message: 'Two citation rows in one file map to the same EID.',
          fileId: file.id,
          row: row.row,
          eid: paper.eid,
        })
        continue
      }
      used.add(paper.eid)
      matches.push({ file, row, paper, method })
    }
  }
  return { matches, issues }
}
