// Opt-in only. Reads external private files; emits aggregate indicators, never raw rows.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyze, parseText, referenceFromMaxlog } from '../app/lib/cscore/index'
const directory = process.env.CSCORE_PRIVATE_FIXTURES
if (!directory)
  throw new Error('Set CSCORE_PRIVATE_FIXTURES to an external private fixture directory.')
const names = [
  'ioannidis-publications.csv',
  'ioannidis-citations-including-self-full.csv',
  'ioannidis-citations-excluding-all-self.csv',
  'ioannidis-citations-1996-2021-including-self.csv',
  'ioannidis-citations-1996-2021-excluding-all-self.csv',
]
const files = names.map((name) => parseText(name, readFileSync(join(directory, name), 'utf8')))
const ref = referenceFromMaxlog(
  JSON.parse(readFileSync(join(directory, 'reference/maxlog.json'), 'utf8')),
)
const a = analyze(files, ['57226848754'], ref)
const expected = JSON.parse(readFileSync(join(directory, 'validation-report.json'), 'utf8')).results
for (const m of a.modes) {
  if (!m.result)
    throw new Error(`${m.scope}/${m.selfMode} blocked: ${JSON.stringify(m.issues.slice(0, 4))}`)
  const key = `${m.scope === 'career' ? 'career_2025' : 'singleyr_2025'}_${m.selfMode === 'with-self' ? 'inc' : 'exc'}`
  for (const [k, v] of Object.entries(m.result.metrics))
    if (Math.abs(v - expected[key].metrics[k]) > 1e-10) throw new Error(`${key} ${k}: ${v} differs`)
  if (Math.abs(m.result.cScore - expected[key].c_score) > 1e-12)
    throw new Error(`${key} score differs`)
  console.log(key, JSON.stringify(m.result))
}
