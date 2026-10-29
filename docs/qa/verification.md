# Verification — 2026-10-29

Environment: macOS, Node 24.15.0, npm 11, Docker 29.4; locked dependency versions in package-lock.json.

## Second slice (official comparison, Docker)

| Check | Result |
|---|---|
| `npm test` | 33 passed (engine, state, official comparison) |
| `npm run typecheck` / `npm run format:check` | Passed |
| `npm run generate` | Passed |
| `npm run test:e2e` (local static preview) | 28 passed: Chromium, Firefox, WebKit, mobile Chromium |
| `BASE_URL=http://localhost:8080 npm run test:e2e` against the Docker image | 28 passed, with CSP violations treated as failures |
| Opt-in `npm run test:private` | Four modes reproduced the recorded scores |
| `scripts/build-reference.py` | 20 fields, 174 subfields per scope; every 2% line within c@95–c@99 |

The first Docker run failed 3 Chromium tests: Nuxt UI's file upload fetches `blob:` URLs, which `connect-src 'self'` blocked. `blob:` was added; it never leaves the device. The 2% derivation was checked against Table 1: for listed authors outside the global top 100,000, the maximum subfield rank/count is exactly 0.0200.

Review fix: adding or removing a file no longer clears manual matching decisions, and a decision pointing to an EID that is no longer a candidate is ignored so the row can be resolved again (unit tests added).

## First slice

| Check | Result |
|---|---|
| `npm test` | 29 passed |
| `npm run test:e2e` | 24 passed |
| `npm audit` | 8 low; 0 moderate, high or critical |

Browser tests cover four-mode import/calculation, local downloads without raw personal records, incomplete data recovery, unsupported file replacement, cancellation races, absence of input transmission/storage, narrow-screen overflow, subfield comparison not changing scores, and axe WCAG 2 A/AA + 2.1 AA checks. Automated accessibility coverage is not certification of every interaction.

Private parity uses one real author, Ioannidis (57226848754). This is implementation parity, not a claim of exact official snapshot reproduction or broad author validation; per-metric differences from the official row are in HANDOFF.md. No production deployment or final tutorial video was performed.
