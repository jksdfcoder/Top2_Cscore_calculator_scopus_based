# Security and privacy

This is a personal open-source project maintained by jksdfcoder. No university, employer or organization operates it. Data-provider names and reference authors' affiliations are attribution, not project ownership.

## Data handling

- Imported CSV contents are read and calculated in browser memory. The application has no upload endpoint, account, analytics or persistent browser database.
- Network requests retrieve application assets, synthetic examples and public comparison data. Selecting a subfield retrieves its public reference file; the host can observe that request. Imported records are not placed in requests.
- Clear removes the application's references to files, author selection, calculations and matching decisions. Generation checks prevent a pending import or example request from restoring cleared state. This is not a promise of secure memory erasure; browser and operating-system memory handling is outside application control.
- JSON and CSV reports are created locally. JSON contains exact-file SHA-256 hashes and aggregate results; CSV contains aggregate metrics. Reports omit raw records, filenames, author identifiers and matching decisions. Hashes and aggregate metrics are not a guarantee of anonymity: do not publish private reports without considering their contents.
- No imported text is rendered as HTML. CSV report cells contain fixed labels and numeric results, not imported spreadsheet formulas.
- Static hosting providers may retain connection information, including IP addresses and asset requests. External source links are opened only on user action. The application does not control browser extensions, hosting accounts or compromised devices.

## Review — 30 October 2026

An independent source review checked imports, matching, rendering, downloads, storage, cancellation, network paths and static deployment. A separate blind review identified personal ownership under jksdfcoder and no evidence of institutional operation or sponsorship.

A developer-only private-validation error path previously printed complete issue objects, potentially including publication titles and candidate records. It now prints issue codes only, with a synthetic canary regression test. Docker build context excludes environment files.

Browser privacy checks exercise a synthetic private-input canary, same-origin GET-only traffic, empty local/session storage, IndexedDB, Cache Storage and service-worker registrations, clear and reload. Static output inspection found no private markers or source maps; shipped CSV files are synthetic examples only. These checks are evidence about the tested build, not an assurance against every attack.

The production-dependency audit reported eight low-severity entries, including transitive build-tool issues, and no moderate/high/critical entries. Some are multiple dependency paths to the same advisory. The published Pages site serves static output and does not run the Nuxt development server. No forced downgrade was applied to silence the audit. Recheck dependencies before releases.

Current files omit the maintainer's subscription-institution branding. Public Git history still contains earlier author/committer identities and wording; changing current files and future Git identity does not anonymize old commits. Repository links, historical metadata and public account information remain discoverable. Source attribution and public comparison-author affiliations are retained.

## Reporting a problem

Report reproducible issues through the repository using synthetic inputs. Never attach real Scopus exports, account screenshots, cookies, credentials, local paths or sensitive audit reports to public issues. If the reproduction needs private data, describe the issue without posting those data; the project has no private upload service.
