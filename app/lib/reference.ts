import maxlog from '../../public/reference/v9/maxlog.json'
import { referenceFromMaxlog } from './cscore'

export const reference = referenceFromMaxlog(maxlog)
export const metricLabels = {
  NC: 'Total citations',
  H: 'h-index',
  Hm: 'Coauthorship-adjusted hm-index',
  NCS: 'Citations · single author',
  NCSF: 'Citations · single or first author',
  NCSFL: 'Citations · single, first or last author',
}
export const scopeLabel = (scope: string) => (scope === 'career' ? 'Career' : 'Single year')
export const selfLabel = (mode: string) =>
  mode === 'with-self'
    ? 'Including self-citations'
    : mode === 'without-self'
      ? 'Excluding all-author self-citations'
      : mode === 'selected-author'
        ? 'Selected-author exclusion (unsupported)'
        : 'Unknown self-citation setting'
