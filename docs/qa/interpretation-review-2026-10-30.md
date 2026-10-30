# Interpretation and UI review — 30 October 2026

## Scope and evidence

Reviewed the import, author confirmation, score, demo, comparison, methodology, download,
footer and repository descriptions. This review improves interpretation; it does not establish
complete parity with the V9 production pipeline or provide a legal determination.

Sources: [V9 dataset](https://doi.org/10.17632/btchxktzyw.9),
[official FAQ](https://www.elsevier.support/scopus/answer/topcited-scientists-database-faqs),
and [2019 methods](https://doi.org/10.1371/journal.pbio.3000384).
The publicly released V6 core code was separately inspected in the private parent research folder.

## Findings and changes

- The score is an author-level citation indicator across eligible research areas. Added a visible
  Estimate label and nearby scope, profile, export, citation-date and research-quality limitations.
- User-selected comparison subfields are not verified official classifications. This distinction
  and the absence of an official inclusion decision now appear above the graph, without expansion.
- Removed interpolated personal integer ranks. Kept historical sampled V9 author ranks with an
  explicit V9 label. Markers are illustrative interpolations within available points only.
- Removed first-place extrapolation and the invented zero-score endpoint. Out-of-range scores
  produce text instead of a personal graph position. Including-self positions use published
  percentile points; excluding-self positions use sampled listed-author points only.
- Published all-author percentile bands are available only with self-citations. The excluding-self
  mode says so rather than borrowing an incompatible percentile distribution.
- The top-2% line is labelled a derived historical benchmark, not an eligibility test. Methods
  explain both official selection routes and the inability to recreate the historical snapshot.
- Demo scores are explicitly synthetic; actual imports and published reference data are not
  described as simulated. Radar legends distinguish synthetic and real-input estimates.
- Export instructions ask users to check publication ownership. Methods cover merged/split author
  profiles, missing/misassigned papers and the limitations of a single interdisciplinary category.
- Audit JSON carries interpretation limits. CSV retains numeric columns and adds result_type
  (calculated_estimate or synthetic_estimate); download filenames say estimates.
- Metadata and README no longer suggest official ranking or omit the shipped sampled authors.
  Footer terms retain licensing, attribution, personal ownership and hosting-log boundaries.

## Verification

Unit checks cover out-of-range suppression and interpolation endpoints. Browser journeys cover
visible notices, no invented personal rank, mode-specific bands, unchanged scores after choosing
subfields, downloads, animation ordering, local-data privacy, accessibility and narrow screens.
Desktop and 390px mobile renders were inspected with Ego Browser; no horizontal overflow observed.
GitHub Pages project-path checks run separately against a fresh preview of the prefixed build.

## Remaining limits

The full V9 production pipeline has not been independently reproduced. Reference-author files
contain samples of selected listed authors, not the full author population. A primary subfield
cannot represent all aspects of interdisciplinary research. Current Scopus exports and profile
corrections cannot recreate the archived snapshot. None of the displayed comparisons establishes
research quality, an official personal rank, official classification or list inclusion.
