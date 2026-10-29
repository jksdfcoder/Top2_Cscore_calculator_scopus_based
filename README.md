# C-score calculator

A single-page, local-first calculator for personal Scopus CSV exports. Built with Nuxt 4, Nuxt UI, TypeScript, Papa Parse and ECharts. No account, backend, institutional API key, scraping, analytics or browser persistence.

## Run

Node 24 and npm 11 were used for validation.

```sh
npm ci
npm run dev
```

For a static build: `npm run generate`, then `npm run preview` (http://localhost:4173). Deploy only `.output/public`; deployment is not configured in this slice.

## Current features

- Publications CSV + citation overview exports; multi-file import and author confirmation.
- Career (citations 1996–2025) and single-year (2025) results, including and excluding **all-author** self-citations.
- Six indicators, log-normalized contributions, explanatory radar chart, local JSON/CSV downloads.
- Missing years, unknown exclusion settings, ambiguous matches and conflicting overlaps stop affected calculations. Additional historical windows can be added without joining spreadsheets.
- Synthetic example, built-in export instructions and keyboard-accessible tables.

V9 normalization is fixed. Current Scopus exports are not the official frozen snapshot. This preview does **not** yet include official researcher cohorts, field/subfield comparisons, rankings or selection eligibility. The radar shows a user's score contributions, not comparison to official authors.

## Verify

```sh
npm test
npm run typecheck
npm run generate
npx playwright install chromium firefox webkit
npm run test:e2e
```

Optional private validation: `CSCORE_PRIVATE_FIXTURES=/absolute/path/to/private/exports npm run test:private`. See [HANDOFF.md](HANDOFF.md) for required filenames and next work. Private exports are intentionally excluded from this repository.

## Structure

```text
app/pages/index.vue             Single-page flow
app/components/                Guide, results and chart
app/composables/useAnalysis.ts  Session state and cancellation
app/lib/cscore/                 Framework-independent parser, matching, metrics, reports
public/demo/                   Synthetic data only
public/reference/v9/           Versioned official normalization parameters
scripts/private-parity.ts      Opt-in private validation
tests/unit/                   Engine and asynchronous state tests
tests/e2e/                    Browser, privacy and accessibility checks
docs/plans/                    Original multi-stage plan
docs/tutorial/                 Export instructions and recording preparation
```

## Sources and licensing

Method: [Ioannidis et al., PLOS Biology](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000918). Reference: [Elsevier Data Repository V9](https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/9).

Application source is MIT. Bundled normalization data has a **separate CC BY-NC 3.0 license**; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Open-source code licensing does not remove restrictions on bundled data. Scopus access remains subject to each user's subscription and applicable terms; local processing is a privacy choice, not blanket permission to redistribute exports.
