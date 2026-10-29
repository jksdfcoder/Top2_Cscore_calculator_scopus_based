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
// Indicator definitions: https://doi.org/10.1371/journal.pbio.1002501
export const metricDescriptions = {
  NC: 'Total citations received by your publications in the selected citation window.',
  H: 'The largest h for which h of your publications each received at least h citations in the selected window.',
  Hm: 'A coauthorship-adjusted h-index using fractional paper counts of 1 divided by each paper’s number of authors.',
  NCS: 'Citations to papers on which you are the sole author.',
  NCSF: 'Citations to papers on which you are the sole author or first author.',
  NCSFL: 'Citations to papers on which you are the sole author, first author or last author.',
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
