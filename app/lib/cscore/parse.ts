import Papa from 'papaparse'
import type { CitationRow, ParsedFile, Paper } from './contracts'
// Stable local identity binds manual choices to exact input content (not a security hash).
export function contentId(text: string): string {
  let a = 2166136261,
    b = 5381
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619)
    b = Math.imul(b, 33) ^ text.charCodeAt(i)
  }
  return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}-${text.length}`
}
export function decode(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[\da-f]+|\d+);/gi, (s) => {
    const named: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' ',
    }
    if (named[s.toLowerCase()]) return named[s.toLowerCase()]!
    const hex = s[2]?.toLowerCase() === 'x'
    const n = parseInt(s.slice(hex ? 3 : 2, -1), hex ? 16 : 10)
    return n <= 0x10ffff ? String.fromCodePoint(n) : s
  })
}
export function norm(value: string): string {
  return decode(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}
const splitIssn = (s: string) => s.split(/[;,]/).map(norm).filter(Boolean)
function count(s: string): number | null {
  if (!/^\d+$/.test(s.trim())) return null
  const n = Number(s)
  return Number.isSafeInteger(n) ? n : null
}
export function parseText(name: string, text: string): ParsedFile {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy',
  })
  const rows = parsed.data.map((r) => r.map((c) => c.trim()))
  const file: ParsedFile = {
    id: contentId(text),
    name,
    kind: 'unknown',
    papers: [],
    rows: [],
    selfMode: 'unknown',
    years: [],
    metadata: [],
    issues: [],
  }
  for (const e of parsed.errors)
    file.issues.push({
      code: 'csv-error',
      message: e.message,
      fileId: file.id,
      row: e.row,
    })
  const pi = rows.findIndex(
    (r) => r.includes('EID') && r.includes('Author(s) ID') && r.includes('Title'),
  )
  if (pi >= 0) {
    file.kind = 'publications'
    const h = rows[pi]!
    for (const [i, r] of rows.entries()) {
      if (i <= pi) continue
      const get = (k: string) => r[h.indexOf(k)] ?? ''
      const ids = get('Author(s) ID')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      const fullIds = Array.from(get('Author full names').matchAll(/\((\d+)\)/g), (m) => m[1]!)
      const paper: Paper = {
        eid: get('EID'),
        title: get('Title'),
        publicationYear: Number(get('Year')),
        authorIds: ids,
        authorCount: ids.length,
        sourceTitle: get('Source title'),
        issn: splitIssn(get('ISSN')),
        volume: get('Volume'),
        issue: get('Issue'),
        doi: get('DOI') || undefined,
      }
      if (
        !paper.eid ||
        !paper.title ||
        !/^\d{4}$/.test(get('Year')) ||
        !ids.length ||
        ids.some((id) => !/^\d+$/.test(id)) ||
        new Set(ids).size !== ids.length ||
        (fullIds.length > 0 && fullIds.join(';') !== ids.join(';'))
      )
        file.issues.push({
          code: 'invalid-paper',
          message: 'Publication needs a valid EID, year and consistent ordered author IDs.',
          fileId: file.id,
          row: i + 1,
          eid: paper.eid,
        })
      file.papers.push(paper)
    }
    return file
  }
  const ci = rows.findIndex((r) => r[0] === 'Publication Year' && r.includes('Document Title'))
  if (ci >= 0) {
    file.kind = 'overview'
    file.metadata = rows.slice(0, ci).map((r) => r.join(' '))
    const meta = file.metadata.join(' ')
    const allExcluded = /self citations of all authors are excluded\./i.test(meta)
    const remainder = meta.replace(/self citations of all authors are excluded\./gi, '')
    const unsupportedExclusion = /exclud|remov/i.test(remainder)
    const selectedExclusion =
      !allExcluded && /self citations of (?:the )?selected authors? are excluded\./i.test(meta)
    const standardIncluding = /Author:\s*\S/i.test(meta) && /h-index\s*=\s*\d+/i.test(meta)
    const explicitIncluding = /including self citations|self citations (?:are )?included/i.test(
      meta,
    )
    file.selfMode = unsupportedExclusion
      ? selectedExclusion
        ? 'selected-author'
        : 'unknown'
      : allExcluded
        ? 'without-self'
        : standardIncluding || explicitIncluding
          ? 'with-self'
          : 'unknown'
    if (file.selfMode === 'unknown')
      file.issues.push({
        code: 'unsupported-citation-setting',
        message: 'Citation overview has unknown metadata or an unsupported exclusion setting.',
        fileId: file.id,
      })

    const base = rows[ci]!
    const prev = rows[ci - 1] ?? []
    const headerAbove = prev.slice(6).some((v) => /^[<>]?\d{4}$|^Total$/.test(v))
    const h = base.map((v, i) => (i < 6 ? v : headerAbove ? (prev[i] ?? '') : v))
    file.years = h.filter((s) => /^\d{4}$/.test(s)).map(Number)
    if (!file.years.length)
      file.issues.push({
        code: 'missing-year-header',
        message: 'No explicit citation years found.',
        fileId: file.id,
      })
    for (const [i, r] of rows.entries()) {
      if (i <= ci || !/^\d{4}$/.test(r[0] ?? '')) continue
      const get = (k: string) => r[h.indexOf(k)] ?? ''
      const counts: CitationRow['counts'] = {}
      h.forEach((k, j) => {
        if (j >= 6 && /^\d{4}$|^[<>]\d{4}$/.test(k)) counts[k] = count(r[j] ?? '')
      })
      file.rows.push({
        row: i + 1,
        title: get('Document Title'),
        publicationYear: Number(r[0]),
        sourceTitle: get('Journal Title'),
        issn: splitIssn(get('ISSN')),
        volume: get('Volume'),
        issue: get('Issue'),
        counts,
      })
    }
    return file
  }
  file.issues.push({
    code: 'unknown-format',
    message: 'Use a Scopus documents CSV or Citation overview CSV.',
    fileId: file.id,
  })
  return file
}
