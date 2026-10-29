# Third-party data and code

The application source is licensed under MIT (LICENSE). npm dependencies retain their respective licenses; the lockfile records exact versions.

`public/reference/v9/maxlog.json` transcribes logarithmic normalization denominators from official Table 3 workbooks, attributed to John P. A. Ioannidis, August 2026 data-update, Elsevier Data Repository V9, DOI [10.17632/btchxktzyw.9](https://doi.org/10.17632/btchxktzyw.9). This data is CC BY-NC 3.0, not MIT. See the adjacent LICENSE.txt.

`public/reference/v9/comparison.json` is derived from the same V9 dataset by `scripts/build-reference.py`: field/subfield c-score percentiles copied from Table 2, plus per-subfield top-2% lines and the global top-100,000 line computed from Table 1 ranks. It carries the same CC BY-NC 3.0 license and lists the SHA-256 of every source workbook. No researcher-level rows (names, institutions, scores) are bundled.

Fixtures in tests/fixtures/public and public/demo are synthetic examples created for this project. No personal Scopus exports or authenticated account screenshots are distributed.
