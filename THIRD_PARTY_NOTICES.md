# Third-party data and code

The application source is licensed under MIT (LICENSE). npm dependencies retain their respective licenses; the lockfile records exact versions.

`public/reference/v9/maxlog.json` transcribes logarithmic normalization denominators from official Table 3 workbooks, attributed to John P. A. Ioannidis, August 2026 data-update, Elsevier Data Repository V9, DOI [10.17632/btchxktzyw.9](https://doi.org/10.17632/btchxktzyw.9). This data is CC BY-NC 3.0, not MIT. See the adjacent LICENSE.txt.

`public/reference/v9/comparison.json` is derived from the same V9 dataset by `scripts/build-reference.py`: field/subfield c-score percentiles copied from Table 2, plus per-subfield top-2% lines and the global top-100,000 line computed from Table 1 ranks. It carries the same CC BY-NC 3.0 license and lists the SHA-256 of every source workbook. `public/reference/v9/peers/` holds, per subfield, scope and self-citation setting, up to 160 listed authors spaced evenly in log subfield rank (name, institution, subfield rank, c-score and six indicators) copied from Table 1 for the radar comparison, under the same license.

Fixtures in tests/fixtures/public and public/demo are synthetic examples created for this project. No personal Scopus exports or authenticated account screenshots are distributed.

`docs/qa/hm-validation-summary.json` includes aggregate official V9 author metrics used for validation. Those source data remain attributed to John P. A. Ioannidis under CC BY-NC 3.0, separately from MIT application code. See the adjacent investigation for provenance and limitations.

`docs/qa/window-audit-summary.json` contains only aggregated results of local window experiments. It does not distribute raw Scopus exports, individual publication records, or account screenshots. The accompanying review attributes official reference values separately to V9.

## Export tutorial clips

`public/tutorial/step1–4.mp4` and their posters show the Scopus web interface (Scopus is a trademark of Elsevier B.V.) for instructional purposes. They were recorded on 29 October 2026 with the author's name, identifiers, affiliation, publications, headline metrics and the signed-in account replaced or hidden before capture; no real export file is included.
