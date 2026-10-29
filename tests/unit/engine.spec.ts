import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  analyze,
  parseText,
  indicators,
  createReport,
  referenceFromMaxlog,
  matchPapers,
  type ReferenceVersion,
} from '../../app/lib/cscore'
const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/public/${name}.csv`, import.meta.url), 'utf8')
const source = () => ['publications', 'including', 'excluding'].map((n) => parseText(n, fixture(n)))
const metrics = { NC: 10, H: 10, Hm: 10, NCS: 10, NCSF: 10, NCSFL: 10 }
const ref: ReferenceVersion = {
  id: 'test',
  citationYear: 2025,
  careerStartYear: 1996,
  maxlog: {
    career: { 'with-self': metrics, 'without-self': metrics },
    'single-year': { 'with-self': metrics, 'without-self': metrics },
  },
}
describe('complete local pipeline', () => {
  it('calculates both windows and self citation modes from synthetic matrix', () => {
    const a = analyze(source(), ['123'], ref)
    expect(a.modes.every((m) => m.ready)).toBe(true)
    expect(a.modes[0]!.result!.metrics).toEqual({
      NC: 16,
      H: 2,
      Hm: 1.5,
      NCS: 10,
      NCSF: 15,
      NCSFL: 16,
    })
    expect(a.modes[1]!.result!.metrics.NC).toBe(12)
    expect(a.modes[2]!.result!.metrics).toEqual(a.modes[0]!.result!.metrics)
  })
  it('rejects unknown and unsupported exclusion metadata', () => {
    for (const meta of [
      'unknown metadata',
      'Author: Example; h-index = 2; Book citations are excluded.',
      'Self citations of all authors are excluded. Book citations are excluded.',
    ]) {
      const f = source()
      f[1] = parseText(
        'unknown',
        fixture('including').replace('Synthetic example — including self citations', meta),
      )
      expect(f[1]!.selfMode).toBe('unknown')
      expect(analyze(f, ['123'], ref).modes.every((m) => !m.ready)).toBe(true)
    }
  })
  it('recognizes actual standard inclusion metadata without an explicit setting', () => {
    const p = parseText(
      'actual-style',
      fixture('including').replace(
        'Synthetic example — including self citations',
        'Author: Example Person\nh-index = 2',
      ),
    )
    expect(p.selfMode).toBe('with-self')
  })
  it('blocks zero bucket contradictions with supplemental explicit years in every mode', () => {
    const f = source()
    const supplement = parseText(
      'supplement',
      fixture('including').replaceAll('<2025', '<2024').replaceAll(',2025,', ',2024,'),
    )
    supplement.rows[0]!.counts['2024'] = 5
    f.push(supplement)
    const a = analyze(f, ['123'], ref)
    expect(
      a.modes
        .filter((m) => m.selfMode === 'with-self')
        .every((m) => !m.ready && m.issues.some((i) => i.code === 'bucket-conflict')),
    ).toBe(true)
  })
  it('never uses a trailing bucket to certify missing future years', () => {
    const f = source()
    for (const r of f[1]!.rows) r.counts = { '<2025': 0, '>2024': 0 }
    const a = analyze(f, ['123'], ref)
    expect(a.modes[0]!.ready).toBe(false)
    expect(a.modes[2]!.ready).toBe(false)
  })
  it('checks zero bucket contradictions against positive contained buckets', () => {
    const f = source()
    const supplement = parseText('buckets', fixture('including'))
    supplement.id += 'different'
    supplement.rows[0]!.counts = { '<2024': 5, '2025': 10 }
    f.push(supplement)
    expect(
      analyze(f, ['123'], ref).modes[0]!.issues.some((i) => i.code === 'bucket-conflict'),
    ).toBe(true)
  })
  it('blocks all modes if all-author exclusion increases a yearly count', () => {
    const f = source()
    f[2]!.rows[0]!.counts['2025'] = 11
    const a = analyze(f, ['123'], ref)
    expect(
      a.modes.every((m) => !m.ready && m.issues.some((i) => i.code === 'self-citation-conflict')),
    ).toBe(true)
  })
  it('does not fill blank counts with zero', () => {
    const f = source()
    f[1] = parseText('blank', fixture('including').replace('0,10,0,10', '0,,0,10'))
    const a = analyze(f, ['123'], ref)
    expect(a.modes[0]!.ready).toBe(false)
    expect(a.modes[0]!.issues.some((i) => i.code === 'missing-count')).toBe(true)
    expect(a.modes[1]!.ready).toBe(true)
  })
  it('withholds missing citation settings rather than substituting', () => {
    const a = analyze(source().slice(0, 2), ['123'], ref)
    expect(a.modes.filter((m) => m.selfMode === 'without-self').every((m) => !m.ready)).toBe(true)
  })
  it('refuses selected-author exclusion', () => {
    const f = source()
    f[2] = parseText('selected', fixture('excluding').replace('all authors', 'selected author'))
    const a = analyze(f, ['123'], ref)
    expect(a.modes[1]!.ready).toBe(false)
    expect(a.modes[1]!.issues.some((i) => i.code === 'selected-author-exclusion')).toBe(true)
  })
  it('rejects conflicting overlapping counts without summing them', () => {
    const f = source()
    f.push(parseText('conflict', fixture('including').replace('0,10,0,10', '0,11,0,11')))
    expect(
      analyze(f, ['123'], ref).modes[0]!.issues.some((i) => i.code === 'overlap-conflict'),
    ).toBe(true)
  })
  it('deduplicates identical input and publication EIDs', () => {
    const f = source()
    f.push(f[0]!, f[1]!)
    expect(analyze(f, ['123'], ref).modes[0]!.result!.metrics.NC).toBe(16)
  })
  it('requires an earlier window for nonzero historical buckets crossing 1996', () => {
    const f = source()
    f[0]!.papers[0]!.publicationYear = 1990
    f[1]!.rows[0]!.publicationYear = 1990
    f[1]!.rows[0]!.counts['<2025'] = 3
    const a = analyze(f, ['123'], ref)
    expect(a.modes[0]!.ready).toBe(false)
    expect(a.modes[2]!.ready).toBe(true)
  })
  it('does not expose raw data or filenames in exported report', () => {
    const f = source()
    const r = JSON.stringify(createReport(analyze(f, ['123'], ref), f, ref))
    expect(r).not.toContain('A synthetic solitary paper')
    expect(r).not.toContain('publications.csv')
    expect(r).not.toContain('authorIds')
  })
  it('excludes future publications', () => {
    const f = source()
    f[0]!.papers[0]!.publicationYear = 2026
    f[1]!.rows[0]!.publicationYear = 2026
    f[2]!.rows[0]!.publicationYear = 2026
    expect(analyze(f, ['123'], ref).modes[0]!.result!.metrics.NC).toBe(6)
  })
  it('requires unique author identity', () =>
    expect(analyze(source(), ['999'], ref).modes.every((m) => !m.ready)).toBe(true))
})
describe('parsing and constrained matching', () => {
  it('locates headers after arbitrary metadata; supports BOM, quoted multiline and entities', () => {
    const s =
      '\uFEFFNotes,hello\nEID,Title,Year,Author(s) ID,Author full names\n2-s2.0-1,"Line one\nLine two",2020,123,"Person &amp; Other (123)"'
    const p = parseText('arbitrary', s)
    expect(p.papers[0]!.title).toBe('Line one\nLine two')
    expect(p.papers[0]!.authorCount).toBe(1)
    expect(p.issues).toEqual([])
  })
  it('does not treat four-digit citation summaries as year headers', () => {
    const text = fixture('including').replace('0,16,0,16', '2004,2022,0,4026')
    const p = parseText('summary', text)
    expect(p.years).toEqual([2025])
    expect(p.rows[0]!.counts['2025']).toBe(10)
  })
  it('rejects unknown formats and invalid author order', () => {
    expect(parseText('x', 'hello,world').issues[0]!.code).toBe('unknown-format')
    const p = parseText(
      'bad',
      fixture('publications').replace(
        'Synthetic Person (123); Example Person (456)',
        'Synthetic Person (456); Example Person (123)',
      ),
    )
    expect(p.issues.some((i) => i.code === 'invalid-paper')).toBe(true)
  })
  it('keeps overview summary outside per-paper records', () => {
    expect(source()[1]!.rows).toHaveLength(3)
    expect(source()[1]!.years).toEqual([2025])
  })
  it('matches a translated title but never silently chooses ambiguity', () => {
    const f = source(),
      p = {
        ...f[0]!.papers[0]!,
        title: 'A synthetic solitary paper; [Translation]',
      }
    expect(matchPapers([p], [f[1]!]).matches[0]!.paper.eid).toBe(p.eid)
    const dup = { ...p, eid: '2-s2.0-99' }
    const a = matchPapers([p, dup], [f[1]!])
    expect(a.issues[0]!.code).toBe('ambiguous-match')
    const decision = a.issues[0]!.decisionKey!
    expect(matchPapers([p, dup], [f[1]!], { [decision]: dup.eid }).matches[0]!.paper.eid).toBe(
      dup.eid,
    )
    const stale = matchPapers([p, dup], [f[1]!], { [decision]: '2-s2.0-gone' })
    expect(stale.issues[0]!.candidates).toHaveLength(2)
  })
  it('rejects duplicate row reuse in one file', () => {
    const f = source()
    f[1]!.rows.push({ ...f[1]!.rows[0]!, row: 100 })
    expect(matchPapers(f[0]!.papers, [f[1]!]).issues[0]!.code).toBe('duplicate-row-reuse')
  })
  it('requires independent source and volume evidence for truncated titles', () => {
    const f = source(),
      p = {
        ...f[0]!.papers[0]!,
        title: 'This long title contains at least thirty letters <tail>',
      }
    f[1]!.rows = [
      {
        ...f[1]!.rows[0]!,
        title: 'This long title contains at least thirty letters',
      },
    ]
    expect(matchPapers([p], [f[1]!]).matches).toHaveLength(1)
    f[1]!.rows[0]!.volume = 'other'
    expect(matchPapers([p], [f[1]!]).matches).toHaveLength(0)
  })
})
describe('metrics and normalization', () => {
  it('orders EID numerically with BigInt before cumulative fractional ranks', () => {
    const p = [
      {
        eid: '2-s2.0-10',
        citations: 1,
        authorCount: 1,
        position: 'middle' as const,
      },
      {
        eid: '2-s2.0-2',
        citations: 1,
        authorCount: 2,
        position: 'middle' as const,
      },
    ]
    expect(indicators(p).Hm).toBe(0.5)
  })
  it('does not cap contributions above one', () => {
    const f = source()
    const a = analyze(f, ['123'], {
      ...ref,
      maxlog: {
        ...ref.maxlog,
        career: { ...ref.maxlog.career, 'with-self': { ...metrics, NC: 1 } },
      },
    })
    expect(a.modes[0]!.result!.contributions.NC).toBeGreaterThan(1)
  })
  it('returns zero metrics for an empty corpus', () =>
    expect(Object.values(indicators([]))).toEqual([0, 0, 0, 0, 0, 0]))
  it('loads already logged official denominators unchanged', () => {
    const modes = Object.fromEntries(
      [
        'career_with_self',
        'career_without_self',
        'singleyr_with_self',
        'singleyr_without_self',
      ].map((k) => [k, { denominators: metrics }]),
    )
    expect(referenceFromMaxlog({ modes }).maxlog.career['with-self'].NC).toBe(10)
  })
})
