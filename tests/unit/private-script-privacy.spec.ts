import { test, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

test('blocked private validation logs codes without publication metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cscore-private-log-test-'))
  const canary = 'PRIVATE_PUBLICATION_TITLE_CANARY_791364'
  try {
    const fixture = (name: string) => readFileSync(resolve('tests/fixtures/public', name), 'utf8')
    const publications = fixture('publications.csv').replaceAll('123', '57226848754')
    const overview = (name: string) =>
      fixture(name).replaceAll('A synthetic solitary paper', canary)
    writeFileSync(join(directory, 'ioannidis-publications.csv'), publications)
    for (const name of [
      'ioannidis-citations-including-self-full.csv',
      'ioannidis-citations-1996-2021-including-self.csv',
    ])
      writeFileSync(join(directory, name), overview('including.csv'))
    for (const name of [
      'ioannidis-citations-excluding-all-self.csv',
      'ioannidis-citations-1996-2021-excluding-all-self.csv',
    ])
      writeFileSync(join(directory, name), overview('excluding.csv'))
    mkdirSync(join(directory, 'reference'))
    writeFileSync(
      join(directory, 'reference/maxlog.json'),
      readFileSync('public/reference/v9/maxlog.json'),
    )
    writeFileSync(join(directory, 'validation-report.json'), JSON.stringify({ results: {} }))
    const result = spawnSync(resolve('node_modules/.bin/tsx'), ['scripts/private-parity.ts'], {
      env: { ...process.env, CSCORE_PRIVATE_FIXTURES: directory },
      encoding: 'utf8',
    })
    const output = `${result.stdout}${result.stderr}`
    expect(result.status).not.toBe(0)
    expect(output).toContain('blocked:')
    expect(output).not.toContain(canary)
    expect(output).not.toContain('A synthetic solitary paper')
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
