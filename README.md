# C-score calculator

A personal, independently maintained open-source project by jksdfcoder. It is not operated on behalf of any university, employer or organization. References to Stanford, Elsevier and Scopus identify the methodology and data sources, not project ownership or endorsement.

A single-page, local-first calculator for personal Scopus CSV exports. Built with Nuxt 4, Nuxt UI, TypeScript, Papa Parse and ECharts. No account, backend, institutional API key, scraping, analytics or browser persistence.

Privacy and security boundaries, review findings and safe reporting: [SECURITY.md](SECURITY.md).

## Run

Node 24 and npm 11 were used for validation.

```sh
npm ci
npm run dev
```

For a static build: `npm run generate`, then `npm run preview` (http://localhost:4173). GitHub Actions publishes `.output/public` to [the live calculator](https://jksdfcoder.github.io/Top2_Cscore_calculator_scopus_based/) after checks pass on main. See [deployment and data-use boundaries](docs/compliance-and-deployment.md).

Docker (static files behind nginx with a restrictive CSP): `docker build -t cscore-calculator . && docker run -p 8080:8080 cscore-calculator`. Browser tests can target it with `BASE_URL=http://localhost:8080 npm run test:e2e`.

Rebuild the official comparison data (needs the V9 Table 1 and Table 2 workbooks, not in this repo): `python3 scripts/build-reference.py --table1-dir <dir> --table2-dir <dir> --out public/reference/v9/comparison.json --peers-out public/reference/v9/peers`.

## Current features

- Publications CSV + citation overview exports; multi-file import and author confirmation.
- Career (citations 1996–2025) and single-year (2025) results, including and excluding **all-author** self-citations.
- Six indicators, log-normalized contributions, explanatory radar chart, local JSON/CSV downloads.
- Missing years, unknown exclusion settings, ambiguous matches and conflicting overlaps stop affected calculations. Additional historical windows can be added without joining spreadsheets.
- Synthetic example, built-in export instructions and keyboard-accessible tables.

V9 normalization is fixed. The author-level c-score combines eligible publications across research areas; choosing a field does not change it. Current exports cannot recreate the frozen V9 Scopus snapshot. Profile merges, splits, misassigned publications and incomplete exports can affect estimates. Citation impact is not a complete assessment of research quality.

Subfields are user-selected reference comparisons, not verified official classifications. Including-self comparisons use published all-author percentile bands. Excluding-self mode has no published all-author percentile band. The page also ships sampled V9 listed-author records for historical radar comparisons and a derived subfield top-2% benchmark. Illustrated positions are interpolated only within available reference points, with no personal integer rank or extrapolation. Neither a comparison band nor crossing a benchmark confirms official inclusion; the published selection also has an all-science top-100,000 route. Key interpretation limits are always visible beside the score and comparison; detailed data terms remain expandable.

## Verify

```sh
npm test
npm run typecheck
npm run generate
npx playwright install chromium firefox webkit
npm run test:e2e
```

Optional private validation: `CSCORE_PRIVATE_FIXTURES=/absolute/path/to/private/exports npm run test:private`. See [HANDOFF.md](HANDOFF.md) for required filenames and next work. Private exports are intentionally excluded from this repository. Additional externally supplied samples can be checked with `CSCORE_SAMPLE_MANIFEST=/absolute/path/manifest.json npm run validate:sample`; see the [three-author Hm investigation](docs/qa/hm-validation-2026-10-29.md). The [window and snapshot review](docs/qa/window-review-2026-10-29.md) distinguishes statistical years from historical database state.

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
