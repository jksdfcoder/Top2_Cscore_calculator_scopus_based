// Opt-in real-data research. The manifest and CSV files stay outside the repository.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  analyze,
  metricNames,
  parseText,
  type Metrics,
  type Scope,
  type SelfMode,
} from '../app/lib/cscore'
import { reference } from '../app/lib/reference'

interface ExpectedMode {
  scope: Scope
  selfMode: SelfMode
  metrics: Metrics
  cScore: number
}
interface Manifest {
  authorIds: string[]
  files: string[]
  // Engine content ID + physical row -> EID. Manually researched, never guessed.
  decisions?: Record<string, string>
  expected: ExpectedMode[] // Independent calculation from the same exports.
  official?: ExpectedMode[] // Frozen published values: comparison, not a pass/fail tolerance.
}

const path = process.env.CSCORE_SAMPLE_MANIFEST
if (!path) throw new Error('Set CSCORE_SAMPLE_MANIFEST to an external JSON manifest.')
const manifest: Manifest = JSON.parse(readFileSync(path, 'utf8'))
if (!manifest.authorIds?.length || !manifest.files?.length || manifest.expected?.length !== 4)
  throw new Error('Manifest needs authorIds, files, and four independent expected modes.')
const inputs = manifest.files.map((file) => {
  const contents = readFileSync(resolve(dirname(path), file), 'utf8')
  return {
    parsed: parseText('private-input.csv', contents),
    sha256: createHash('sha256').update(contents).digest('hex'),
  }
})
const analysis = analyze(
  inputs.map((i) => i.parsed),
  manifest.authorIds,
  reference,
  manifest.decisions,
)
const modes = analysis.modes.map((mode) => {
  if (!mode.result) {
    // Avoid leaking raw titles from error messages.
    throw new Error(
      `${mode.scope}/${mode.selfMode} blocked: ${[...new Set(mode.issues.map((i) => i.code))].join(', ')}`,
    )
  }
  const expected = manifest.expected.find(
    (e) => e.scope === mode.scope && e.selfMode === mode.selfMode,
  )
  if (
    !expected ||
    metricNames.some(
      (k) =>
        !Number.isFinite(expected.metrics[k]) ||
        Math.abs(mode.result!.metrics[k] - expected.metrics[k]) > 1e-10,
    ) ||
    !Number.isFinite(expected.cScore) ||
    Math.abs(mode.result.cScore - expected.cScore) > 1e-12
  )
    throw new Error(`${mode.scope}/${mode.selfMode} differs from independent expected calculation.`)
  const official = manifest.official?.find(
    (e) => e.scope === mode.scope && e.selfMode === mode.selfMode,
  )
  return {
    ...mode.result,
    official: official ? { metrics: official.metrics, cScore: official.cScore } : undefined,
    differences: official
      ? {
          metrics: Object.fromEntries(
            metricNames.map((k) => [k, mode.result!.metrics[k] - official.metrics[k]]),
          ),
          cScore: mode.result.cScore - official.cScore,
        }
      : undefined,
  }
})
console.log(
  JSON.stringify(
    {
      reference: reference.id,
      inputSha256: inputs.map((i) => i.sha256),
      manualDecisionCount: Object.keys(manifest.decisions ?? {}).length,
      modes,
    },
    null,
    2,
  ),
)
