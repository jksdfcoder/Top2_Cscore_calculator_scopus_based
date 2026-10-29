import { metricNames, type Analysis, type ParsedFile, type ReferenceVersion } from './contracts'
export function createReport(analysis: Analysis, files: ParsedFile[], reference: ReferenceVersion) {
  return {
    schemaVersion: 1,
    reference: {
      id: reference.id,
      citationYear: reference.citationYear,
      careerStartYear: reference.careerStartYear,
    },
    files: files.map((f) => ({
      id: f.id,
      kind: f.kind,
      selfMode: f.selfMode,
      publicationRows: f.papers.length,
      citationRows: f.rows.length,
      years: f.years,
    })),
    modes: analysis.modes.map((m) => ({
      scope: m.scope,
      selfMode: m.selfMode,
      ready: m.ready,
      ...(m.result ? { result: m.result } : {}),
      issueCounts: Object.fromEntries(
        [...new Set(m.issues.map((i) => i.code))].map((code) => [
          code,
          m.issues.filter((i) => i.code === code).length,
        ]),
      ),
    })),
    limitations: [
      'Locally calculated from the supplied export snapshot; not an official selection or global percentile.',
      'Raw publication data, filenames, author IDs and manual decisions are excluded from this report.',
    ],
  }
}
export function metricsCsv(analysis: Analysis): string {
  const lines = [['scope', 'self_mode', 'paper_count', ...metricNames, 'c_score'].join(',')]
  for (const m of analysis.modes)
    if (m.result) {
      const r = m.result
      lines.push(
        [r.scope, r.selfMode, r.paperCount, ...metricNames.map((k) => r.metrics[k]), r.cScore].join(
          ',',
        ),
      )
    }
  return lines.join('\r\n') + '\r\n'
}
