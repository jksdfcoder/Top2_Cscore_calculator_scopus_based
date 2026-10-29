export type SelfMode = 'with-self' | 'without-self'
export type Scope = 'career' | 'single-year'
export const metricNames = ['NC', 'H', 'Hm', 'NCS', 'NCSF', 'NCSFL'] as const
export type Metrics = Record<(typeof metricNames)[number], number>
export interface Issue {
  code: string
  message: string
  severity?: 'error' | 'warning'
  fileId?: string
  row?: number
  eid?: string
  candidates?: { eid: string; title: string; sourceTitle: string }[]
  decisionKey?: string
}
export interface Paper {
  eid: string
  title: string
  publicationYear: number
  authorIds: string[]
  authorCount: number
  sourceTitle: string
  issn: string[]
  volume: string
  issue: string
  doi?: string
}
export interface CitationRow {
  row: number
  title: string
  publicationYear: number
  sourceTitle: string
  issn: string[]
  volume: string
  issue: string
  counts: Record<string, number | null>
}
export interface ParsedFile {
  id: string
  name: string
  kind: 'publications' | 'overview' | 'unknown'
  papers: Paper[]
  rows: CitationRow[]
  selfMode: SelfMode | 'selected-author' | 'unknown'
  years: number[]
  metadata: string[]
  issues: Issue[]
}
export interface ReferenceVersion {
  id: string
  citationYear: number
  careerStartYear: number
  maxlog: Record<Scope, Record<SelfMode, Metrics>>
}
export interface CalculationResult {
  scope: Scope
  selfMode: SelfMode
  metrics: Metrics
  contributions: Metrics
  cScore: number
  paperCount: number
}
export interface ModeAnalysis {
  scope: Scope
  selfMode: SelfMode
  ready: boolean
  issues: Issue[]
  result?: CalculationResult
}
export interface Analysis {
  papers: Paper[]
  issues: Issue[]
  modes: ModeAnalysis[]
  decisions: Record<string, string>
}
export interface MatchedRow {
  file: ParsedFile
  row: CitationRow
  paper: Paper
  method: string
}
export interface MatchResult {
  matches: MatchedRow[]
  issues: Issue[]
}
